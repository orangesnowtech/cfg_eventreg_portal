import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import type { EventField, EventStatus } from "@/types/event";
import { validateEventForm, validateEventAccess, cleanUrl, cleanSenderName } from "@/lib/validations/event-form";

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("public") === "true") {
      const snapshot = await adminDb.collection("events").where("status", "==", "published").orderBy("createdAt", "desc").get();
      // Programmes share this collection but are not events; they are reached only
      // by their own /programmes/[slug] link, never through an events listing.
      return NextResponse.json({ events: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((event) => (event as { kind?: string }).kind !== "programme") });
    }
    await requireAdmin(request);
    const snapshot = await adminDb.collection("events").orderBy("createdAt", "desc").get();
    const events = await Promise.all(snapshot.docs.map(async (doc) => {
      // Real count is derived by subtraction so that registrations written before
      // the isTest flag existed are still counted as real rather than skipped.
      const [total, tests] = await Promise.all([
        adminDb.collection("registrations").where("eventId", "==", doc.id).count().get(),
        adminDb.collection("registrations").where("eventId", "==", doc.id).where("isTest", "==", true).count().get(),
      ]);
      const testCount = tests.data().count;
      return { id: doc.id, ...doc.data(), registrationCount: total.data().count - testCount, testCount };
    }));
    return NextResponse.json({ events });
  } catch (error) { return authError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    const fields = body.form?.fields as EventField[];
    if (!body.name) return NextResponse.json({ error: "Provide an event name." }, { status: 400 });
    const formError = validateEventForm(body.form);
    if (formError) return NextResponse.json({ error: formError }, { status: 400 });
    const accessError = validateEventAccess(body.accessMode, body.joinUrl);
    if (accessError) return NextResponse.json({ error: accessError }, { status: 400 });
    const slug = slugify(body.slug || body.name);
    if (!slug) return NextResponse.json({ error: "A valid event slug is required." }, { status: 400 });
    const duplicate = await adminDb.collection("events").where("slug", "==", slug).limit(1).get();
    if (!duplicate.empty) return NextResponse.json({ error: "That event slug is already in use." }, { status: 409 });
    const now = new Date().toISOString();
    const ref = await adminDb.collection("events").add({ name: String(body.name).trim().slice(0, 160), slug, description: String(body.description || "").slice(0, 2000), venue: String(body.venue || "").slice(0, 300), bannerUrl: cleanUrl(body.bannerUrl), accessMode: body.accessMode || "code", joinUrl: cleanUrl(body.joinUrl), joinInstructions: String(body.joinInstructions || "").slice(0, 1000), emailFromName: cleanSenderName(body.emailFromName), startAt: body.startAt || null, endAt: body.endAt || null, timezone: body.timezone || "Africa/Lagos", remindersEnabled: body.remindersEnabled !== false, status: "draft" as EventStatus, form: { title: String(body.form.title).slice(0, 160), introText: String(body.form.introText || "").slice(0, 1000), successMessage: String(body.form.successMessage || "Registration received.").slice(0, 500), fields }, createdAt: now, updatedAt: now, createdBy: actor.uid });
    return NextResponse.json({ event: { id: ref.id, slug } }, { status: 201 });
  } catch (error) { return authError(error); }
}