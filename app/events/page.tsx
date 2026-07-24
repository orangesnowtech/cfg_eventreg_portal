import Link from "next/link";
import Image from "next/image";
import EventCountdown from "@/components/EventCountdown";
import { getGroupedPublicEvents } from "@/lib/events";
import type { EventRecord } from "@/types/event";

export const dynamic = "force-dynamic";

function EventCard({ event, phase }: { event: EventRecord; phase: string }) {
  const open = event.status === "published" && phase !== "past";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {event.bannerUrl && (
        <div className="relative aspect-3/1 w-full">
          <Image
            src={event.bannerUrl}
            alt={`${event.name} banner`}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-cfg-primary">{event.name}</h3>
        {phase === "present" && (
          <span className="h-fit shrink-0 rounded-full bg-cfg-secondary px-3 py-1 text-xs font-bold text-cfg-primary">
            Live
          </span>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-500">
        {event.startAt && <span>{new Date(event.startAt).toLocaleString()}</span>}
        {event.venue && <span className="block">{event.venue}</span>}
      </div>

      {event.description && (
        <p className="mt-3 line-clamp-3 text-sm text-gray-600">
          {event.description}
        </p>
      )}

      {phase === "upcoming" && event.startAt && (
        <div className="mt-5">
          <EventCountdown startAt={event.startAt} />
        </div>
      )}

      <div className="mt-6 pt-1">
        {open ? (
          <Link
            href={`/events/${event.slug}`}
            className="inline-block rounded-lg bg-cfg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            {phase === "present" ? "Register / check in" : "Register"}
          </Link>
        ) : (
          <span className="text-sm font-medium text-gray-400">
            Registration closed
          </span>
        )}
      </div>
      </div>
    </div>
  );
}

function Section({
  title,
  events,
  phase,
}: {
  title: string;
  events: EventRecord[];
  phase: string;
}) {
  if (events.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-5 text-2xl font-bold text-cfg-primary">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} phase={phase} />
        ))}
      </div>
    </section>
  );
}

export default async function EventsIndexPage() {
  const { present, upcoming, past, total } = await getGroupedPublicEvents();

  return (
    <div className="min-h-screen bg-cfg-mint">
      <header className="border-b border-cfg-secondary bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/">
            <Image
              src="/cfg-logo.png"
              alt="CFG Africa"
              width={150}
              height={150}
              className="object-contain"
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-cfg-primary hover:underline"
          >
            Home
          </Link>
        </div>
        <div className="cfg-signature-line"></div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <h1
            className="text-4xl font-bold text-cfg-primary"
            style={{ fontFamily: "Georgia, serif" }}
          >
            CFG Africa Events
          </h1>
          <p className="mt-2 text-gray-700">
            Everything happening now, coming up, and already held.
          </p>
        </div>

        <Section title="Happening now" events={present} phase="present" />
        <Section title="Upcoming events" events={upcoming} phase="upcoming" />
        <Section title="Past events" events={past} phase="past" />

        {total === 0 && (
          <p className="rounded-xl bg-white p-12 text-center text-gray-500">
            No events have been published yet. Check back soon.
          </p>
        )}
      </main>

      <footer className="mt-8 border-t border-gray-300 bg-white/80">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>© 2026 CFG Africa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
