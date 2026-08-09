import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { buildEventFormSchema } from "@/lib/validations/event-form";
import { generateAccessCode } from "@/types/guest";
import { sendRegistrationEmail } from "@/lib/email";
import type { EventRecord } from "@/types/event";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const eventDoc = await adminDb.collection("events").doc(id).get();
    const status = eventDoc.data()?.status;
    if (!eventDoc.exists || (status !== "published" && status !== "testing")) return NextResponse.json({ error: "This event is not accepting registrations." }, { status: 404 });
    // Programmes share this collection but not this endpoint: their rules (institutional
    // email, word limits, disqualifying answers) live in the programme schema, and the
    // generic form validator would wave all of them through and issue an access code.
    if (eventDoc.data()?.kind === "programme") return NextResponse.json({ error: "This event is not accepting registrations." }, { status: 404 });
    const isTest = status === "testing";
    const event = eventDoc.data()!; const result = buildEventFormSchema(event.form.fields).safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Please correct the form errors.", details: result.error.issues }, { status: 400 });
    const values = result.data as Record<string, unknown>; const email = typeof values.email === "string" ? values.email.toLowerCase() : undefined;
    // Test submissions are throwaway, so the same address can be reused while testing.
    if (email && !isTest) { const duplicate = await adminDb.collection("registrations").where("eventId", "==", id).where("email", "==", email).where("isTest", "==", false).limit(1).get(); if (!duplicate.empty) return NextResponse.json({ error: "This email is already registered for this event." }, { status: 409 }); }
    const accessCode = generateAccessCode(); const now = new Date().toISOString(); const name = [values.firstName, values.lastName].filter(Boolean).join(" ") || "Attendee";
    const ref = await adminDb.collection("registrations").add({ eventId: id, form: values, email, name, accessCode, isTest, checkedIn: false, registeredAt: now, checkedInAt: null });
    await adminDb.collection("activityLogs").add({ type: isTest ? "test_registration" : "registration", eventId: id, targetRegistration: ref.id, performedBy: "System", timestamp: now });

    // The registration is already saved; a failed send must not undo it.
    const delivery = email
      ? await sendRegistrationEmail({ event: { id, ...event } as EventRecord, to: email, name, accessCode, isTest })
      : { sent: false, reason: "no email field on this form" };
    if (!delivery.sent) console.warn(`Confirmation email not sent for ${ref.id}: ${delivery.reason}`);

    return NextResponse.json({ success: true, registrationId: ref.id, accessCode, isTest, emailSent: delivery.sent, message: event.form.successMessage || "Registration received." }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 }); }
}