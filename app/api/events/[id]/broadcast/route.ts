import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import { sendBroadcastEmail } from "@/lib/email";
import { applyTokens, sampleRegistration } from "@/lib/message-tokens";
import type { EventRecord } from "@/types/event";

const BATCH_SIZE = 5;

/** Deliberately loose: ZeptoMail is the real validator, this only catches typos. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends an admin-composed message to every real (non-test) registrant of an event.
 * Sends in small concurrent batches to stay within provider rate limits.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const { subject, message, preview, previewTo, previewName } = await request.json();

    const cleanSubject = String(subject || "").trim();
    const cleanMessage = String(message || "").trim();
    if (!cleanSubject) return NextResponse.json({ error: "Add a subject." }, { status: 400 });
    if (!cleanMessage) return NextResponse.json({ error: "Add a message." }, { status: 400 });

    const eventDoc = await adminDb.collection("events").doc(id).get();
    if (!eventDoc.exists) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    const event = { id, ...eventDoc.data() } as EventRecord;

    const snapshot = await adminDb.collection("registrations").where("eventId", "==", id).get();
    const recipients = snapshot.docs
      .map((doc) => doc.data())
      .filter((reg) => !reg.isTest && typeof reg.email === "string" && reg.email);

    if (recipients.length === 0) {
      return NextResponse.json({ error: "This event has no registrants with an email address." }, { status: 400 });
    }

    /**
     * A test send goes to one address and is always stamped: the subject is
     * prefixed and a strip above the message says it is a preview. Those are
     * added here, not by the caller, so this route cannot be used to send
     * unmarked mail from the verified domain to an arbitrary address.
     *
     * Naming a recipient also decides whose data fills the tokens:
     *   left blank — goes to the admin, filled with a real registrant's answers,
     *                which is the truest check that the tokens resolve;
     *   named      — goes to that person, personalised as them, with every other
     *                token shown as a placeholder. An outside reviewer sees the
     *                layout and never a real attendee's answers.
     */
    if (preview) {
      const testEmail = String(previewTo || "").trim().toLowerCase();
      const testName = String(previewName || "").trim();
      const to = testEmail || actor.email;

      if (!LOOKS_LIKE_EMAIL.test(to)) {
        return NextResponse.json(
          {
            error: testEmail
              ? `"${testEmail}" is not a valid email address.`
              : "Your admin account has no email address, so add a test recipient.",
          },
          { status: 400 }
        );
      }

      const named = Boolean(testEmail || testName);
      // With no name to personalise as, the stand-in falls back to the same
      // "there" a real registrant without a name would get, rather than showing
      // the address in the greeting and looking like a bug in the template.
      const standIn = named ? sampleRegistration(event, testName || "there", to) : recipients[0];
      const filledWith = named ? testName || to : standIn.name || "a registrant";

      const result = await sendBroadcastEmail({
        event,
        to,
        name: testName || to,
        subject: `[TEST] ${applyTokens(cleanSubject, event, standIn)}`,
        message: applyTokens(cleanMessage, event, standIn),
        previewNotice: `TEST SEND — this is how the message reaches ${filledWith}. No registrant has received it.`,
      });

      if (!result.sent) {
        return NextResponse.json(
          { error: `Test send failed: ${result.reason || "the provider rejected it"}` },
          { status: 502 }
        );
      }

      await adminDb.collection("activityLogs").add({
        type: "email_broadcast_test",
        eventId: id,
        performedBy: actor.email,
        details: `Test of "${cleanSubject}" sent to ${to}, personalised as ${filledWith}`,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ preview: true, sentTo: to, filledWith });
    }

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((reg) =>
          sendBroadcastEmail({
            event,
            to: reg.email,
            name: reg.name || "there",
            // Resolved per recipient: the same composed text, filled with this
            // registrant's own answers.
            subject: applyTokens(cleanSubject, event, reg),
            message: applyTokens(cleanMessage, event, reg),
          })
        )
      );
      for (const result of results) {
        if (result.sent) sent += 1;
        else failed += 1;
      }
    }

    await adminDb.collection("activityLogs").add({
      type: "email_broadcast",
      eventId: id,
      performedBy: actor.email,
      details: `Sent "${cleanSubject}" to ${sent} of ${recipients.length} registrant(s)`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ sent, failed, total: recipients.length });
  } catch (error) {
    return authError(error);
  }
}
