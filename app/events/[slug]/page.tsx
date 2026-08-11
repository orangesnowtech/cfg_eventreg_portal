import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DynamicRegistrationForm from "@/components/DynamicRegistrationForm";
import { adminDb } from "@/lib/admin";
import { eventPhase } from "@/lib/events";
import type { EventRecord } from "@/types/event";

export const dynamic = "force-dynamic";

async function getEvent(slug: string): Promise<EventRecord | null> {
  const snapshot = await adminDb
    .collection("events")
    .where("slug", "==", slug)
    // Testing events are reachable here by direct link, but stay out of the public listing.
    // Closed ones are served too, so a shared link explains itself instead of 404ing.
    .where("status", "in", ["published", "testing", "closed"])
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  // A programme shares this collection but has its own hardcoded page under
  // /programmes/[slug]; the generic event renderer cannot draw its form.
  if (doc.data().kind === "programme") return null;
  return { id: doc.id, ...doc.data() } as EventRecord;
}

/**
 * Shown in place of the form once an event stops taking registrations — either
 * because an admin closed it or because it has already happened. The events
 * listing has always described both cases as "registration closed"; this is the
 * same message for anyone arriving on the direct link.
 */
function ClosedNotice({ ended }: { ended: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-xl md:p-10">
      <p className="text-sm font-bold uppercase tracking-widest text-orange-600">
        {ended ? "This event has ended" : "Registration closed"}
      </p>
      <h2 className="mt-3 text-2xl font-bold text-cfg-primary">
        {ended
          ? "Registration for this event has ended."
          : "Registration for this event is now closed."}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-gray-600">
        {ended
          ? "Thanks to everyone who joined us. This event is no longer accepting registrations, but there is always something coming up next."
          : "We are no longer accepting new registrations for this event. If you already registered, your confirmation email and access code are still valid."}
      </p>
      <Link
        href="/events"
        className="mt-7 inline-block rounded-lg bg-cfg-primary px-6 py-3 font-semibold text-white"
      >
        See other CFG Africa events
      </Link>
    </div>
  );
}

export default async function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug); if (!event) notFound();
  const ended = eventPhase(event) === "past";
  // A testing event is never treated as closed: the whole point is that the
  // builder can still submit through it before the real dates are set.
  const closed = event.status !== "testing" && (event.status === "closed" || ended);
  return <main className="min-h-screen bg-cfg-mint px-4 py-12"><div className="mx-auto max-w-4xl">{event.bannerUrl && <div className="relative mb-8 aspect-3/1 w-full overflow-hidden rounded-2xl shadow-lg"><Image src={event.bannerUrl} alt={`${event.name} banner`} fill sizes="(max-width: 896px) 100vw, 896px" className="object-cover" priority /></div>}<div className="mb-8 text-center"><p className="font-semibold uppercase tracking-widest text-cfg-secondary">CFG Africa</p><h1 className="mt-2 text-4xl font-bold text-cfg-primary">{event.name}</h1>{event.description && <p className="mx-auto mt-3 max-w-2xl text-gray-700">{event.description}</p>}<div className="mt-4 text-sm text-gray-600">{event.venue && <span>{event.venue}</span>}{event.startAt && <span className="ml-3">{new Date(event.startAt).toLocaleString()}</span>}</div></div>{closed ? <ClosedNotice ended={ended} /> : <DynamicRegistrationForm event={event} />}</div></main>;
}
