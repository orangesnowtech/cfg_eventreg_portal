import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import { sendRegistrationEmail } from "@/lib/email";
import type { EventRecord } from "@/types/event";

/** Re-sends the confirmation email for a single registration. Admin only. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const { registrationId } = await request.json();
    if (!registrationId) return NextResponse.json({ error: "registrationId is required." }, { status: 400 });

    const [eventDoc, regDoc] = await Promise.all([
      adminDb.collection("events").doc(id).get(),
      adminDb.collection("registrations").doc(String(registrationId)).get(),
    ]);
    if (!eventDoc.exists) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (!regDoc.exists || regDoc.data()?.eventId !== id) {
      return NextResponse.json({ error: "Registration not found for this event." }, { status: 404 });
    }

    const reg = regDoc.data()!;
    if (!reg.email) return NextResponse.json({ error: "This registration has no email address on file." }, { status: 400 });

    const result = await sendRegistrationEmail({
      event: { id, ...eventDoc.data() } as EventRecord,
      to: reg.email,
      name: reg.name || "Attendee",
      accessCode: reg.accessCode,
      isTest: Boolean(reg.isTest),
    });

    if (!result.sent) return NextResponse.json({ error: `Could not send: ${result.reason}` }, { status: 502 });

    await adminDb.collection("activityLogs").add({
      type: "email_resent",
      eventId: id,
      targetRegistration: registrationId,
      performedBy: actor.email,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    return authError(error);
  }
}
