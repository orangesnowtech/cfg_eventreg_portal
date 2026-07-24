import Image from "next/image";
import { notFound } from "next/navigation";
import DynamicRegistrationForm from "@/components/DynamicRegistrationForm";
import { adminDb } from "@/lib/admin";
import type { EventRecord } from "@/types/event";

export const dynamic = "force-dynamic";

async function getEvent(slug: string): Promise<EventRecord | null> {
  const snapshot = await adminDb
    .collection("events")
    .where("slug", "==", slug)
    // Testing events are reachable here by direct link, but stay out of the public listing.
    .where("status", "in", ["published", "testing"])
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as EventRecord;
}

export default async function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug); if (!event) notFound();
  return <main className="min-h-screen bg-cfg-mint px-4 py-12"><div className="mx-auto max-w-4xl">{event.bannerUrl && <div className="relative mb-8 aspect-3/1 w-full overflow-hidden rounded-2xl shadow-lg"><Image src={event.bannerUrl} alt={`${event.name} banner`} fill sizes="(max-width: 896px) 100vw, 896px" className="object-cover" priority /></div>}<div className="mb-8 text-center"><p className="font-semibold uppercase tracking-widest text-cfg-secondary">CFG Africa</p><h1 className="mt-2 text-4xl font-bold text-cfg-primary">{event.name}</h1>{event.description && <p className="mx-auto mt-3 max-w-2xl text-gray-700">{event.description}</p>}<div className="mt-4 text-sm text-gray-600">{event.venue && <span>{event.venue}</span>}{event.startAt && <span className="ml-3">{new Date(event.startAt).toLocaleString()}</span>}</div></div><DynamicRegistrationForm event={event} /></div></main>;
}