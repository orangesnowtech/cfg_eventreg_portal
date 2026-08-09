import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { sendApplicationEmail } from "@/lib/email";
import { generateAccessCode } from "@/types/guest";
import {
  CAMPUS_AMBASSADOR_SLUG,
  campusAmbassadorSchema,
  disqualificationReason,
} from "@/lib/programmes/campus-ambassador";
import type { EventRecord } from "@/types/event";

/**
 * Programme applications land in the same `registrations` collection as event
 * registrations, keyed by the programme's record id, so the admin dashboard,
 * attendee table and CSV export work on them without knowing they are different.
 *
 * The form itself is hardcoded (see lib/programmes/campus-ambassador), so this
 * route validates against that programme's own schema rather than the generic
 * field-derived one — the generic builder cannot express word limits, an
 * institutional email domain, multi-select answers or disqualifying options.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    // One hardcoded programme today; a second one adds its schema alongside this.
    if (slug !== CAMPUS_AMBASSADOR_SLUG) {
      return NextResponse.json({ error: "This programme is not accepting applications." }, { status: 404 });
    }

    const snapshot = await adminDb.collection("events").where("slug", "==", slug).limit(1).get();

    const doc = snapshot.docs[0];
    const data = doc?.data();
    const status = data?.status;
    if (!doc || data?.kind !== "programme" || (status !== "published" && status !== "testing")) {
      return NextResponse.json({ error: "This programme is not accepting applications." }, { status: 404 });
    }

    const programme = { id: doc.id, ...doc.data() } as EventRecord;
    const isTest = status === "testing";

    // A body that is not JSON at all is a client error, not a server fault.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please correct the form errors." }, { status: 400 });
    }

    const parsed = campusAmbassadorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please correct the form errors.", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const values = parsed.data;

    // Checked server-side as well as in the browser: the client gate saves the
    // applicant wasted effort, it does not decide who gets recorded.
    const blocked = disqualificationReason(values);
    if (blocked) {
      return NextResponse.json(
        { error: `This application cannot go forward: ${blocked} You're welcome to apply in a later cycle.` },
        { status: 422 }
      );
    }

    // Test submissions are discarded on publish, so an address can be reused while testing.
    if (!isTest) {
      const duplicate = await adminDb
        .collection("registrations")
        .where("eventId", "==", programme.id)
        .where("email", "==", values.email)
        .where("isTest", "==", false)
        .limit(1)
        .get();
      if (!duplicate.empty) {
        return NextResponse.json(
          { error: "An application has already been submitted with this email address." },
          { status: 409 }
        );
      }
    }

    const reference = `CA-${generateAccessCode()}`;
    const now = new Date().toISOString();

    // accessCode carries the reference so the shared admin views and CSV export,
    // which read that key, show applicants something meaningful. checkedIn stays
    // false and is never used: a programme has nothing to check into.
    const ref = await adminDb.collection("registrations").add({
      eventId: programme.id,
      form: values,
      email: values.email,
      name: values.name,
      accessCode: reference,
      isTest,
      checkedIn: false,
      registeredAt: now,
      checkedInAt: null,
    });

    await adminDb.collection("activityLogs").add({
      type: isTest ? "test_application" : "application",
      eventId: programme.id,
      targetRegistration: ref.id,
      performedBy: "System",
      timestamp: now,
    });

    // The application is already saved; a failed send must not undo it.
    const delivery = await sendApplicationEmail({
      programme,
      to: values.email,
      name: values.name,
      reference,
      isTest,
    });
    if (!delivery.sent) console.warn(`Application email not sent for ${ref.id}: ${delivery.reason}`);

    return NextResponse.json(
      { success: true, applicationId: ref.id, reference, isTest, emailSent: delivery.sent },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "We could not submit your application. Please try again." }, { status: 500 });
  }
}
