import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import { validateEventForm, validateEventAccess } from "@/lib/validations/event-form";
import type { EventField } from "@/types/event";

/**
 * Registrations that are not test submissions. Derived by subtraction so that any
 * row written before the isTest flag existed still counts as a real registration.
 */
async function realRegistrationCount(eventId: string) {
  const [total, tests] = await Promise.all([
    adminDb.collection("registrations").where("eventId", "==", eventId).count().get(),
    adminDb.collection("registrations").where("eventId", "==", eventId).where("isTest", "==", true).count().get(),
  ]);
  return total.data().count - tests.data().count;
}

/** Order-sensitive deep comparison of two form field definitions. */
function sameFields(a: EventField[], b: EventField[]) {
  if (!Array.isArray(b) || a.length !== b.length) return false;
  const normalise = (field: EventField) => JSON.stringify({
    id: field.id, label: field.label, type: field.type, required: field.required,
    placeholder: field.placeholder || "", helpText: field.helpText || "", options: field.options || [],
  });
  return a.every((field, index) => normalise(field) === normalise(b[index]));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request); const { id } = await params; const body = await request.json();
    if (body.status && !["draft", "testing", "published", "closed"].includes(body.status)) return NextResponse.json({ error: "Invalid event status." }, { status: 400 });

    const doc = await adminDb.collection("events").doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const editable = ["name", "description", "venue", "startAt", "endAt", "timezone", "status", "featured", "bannerUrl", "accessMode", "joinUrl", "joinInstructions"] as const;

    if (body.accessMode !== undefined || body.joinUrl !== undefined) {
      const accessError = validateEventAccess(
        body.accessMode ?? doc.data()?.accessMode,
        body.joinUrl ?? doc.data()?.joinUrl
      );
      if (accessError) return NextResponse.json({ error: accessError }, { status: 400 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), ...(body.status === "published" ? { publishedAt: new Date().toISOString() } : {}) };
    for (const key of editable) if (body[key] !== undefined) update[key] = body[key];

    // The homepage shows a single featured event, so featuring one clears the rest.
    if (body.featured === true) {
      const previous = await adminDb.collection("events").where("featured", "==", true).get();
      const batch = adminDb.batch();
      previous.docs.forEach((other) => { if (other.id !== id) batch.update(other.ref, { featured: false }); });
      await batch.commit();
    }

    if (body.form !== undefined) {
      const formError = validateEventForm(body.form);
      if (formError) return NextResponse.json({ error: formError }, { status: 400 });

      // Any change to a field definition can invalidate answers already collected under
      // that key, so the field set is frozen as soon as the first registration lands.
      const existing = (doc.data()?.form?.fields || []) as EventField[];
      if (!sameFields(existing, body.form.fields as EventField[]) && (await realRegistrationCount(id)) > 0) {
        return NextResponse.json({ error: "This event already has real registrations, so its form fields are locked. Close it and create a new event if you need a different form." }, { status: 409 });
      }

      update.form = {
        title: String(body.form.title).slice(0, 160),
        introText: String(body.form.introText || "").slice(0, 1000),
        successMessage: String(body.form.successMessage || "Registration received.").slice(0, 500),
        fields: body.form.fields,
      };
    }

    // Going live discards everything collected during testing so the attendee list
    // starts clean. Test rows are dummy data by definition and are never exported.
    let purgedTests = 0;
    if (body.status === "published") {
      const tests = await adminDb.collection("registrations").where("eventId", "==", id).where("isTest", "==", true).get();
      if (!tests.empty) {
        const batch = adminDb.batch();
        tests.docs.forEach((test) => batch.delete(test.ref));
        await batch.commit();
        purgedTests = tests.size;
      }
    }

    await adminDb.collection("events").doc(id).update(update);
    await adminDb.collection("activityLogs").add({ type: "event_updated", eventId: id, performedBy: actor.email, ...(purgedTests ? { details: `Published; cleared ${purgedTests} test submission(s)` } : {}), timestamp: new Date().toISOString() });
    return NextResponse.json({ success: true, purgedTests });
  } catch (error) { return authError(error); }
}