import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import { sendBroadcastEmail } from "@/lib/email";
import type { EventRecord } from "@/types/event";

const BATCH_SIZE = 5;

/**
 * Sends an admin-composed message to every real (non-test) registrant of an event.
 * Sends in small concurrent batches to stay within provider rate limits.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const { subject, message } = await request.json();

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
            subject: cleanSubject,
            message: cleanMessage,
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
