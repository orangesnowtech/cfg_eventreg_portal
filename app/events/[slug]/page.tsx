import type { ReactNode } from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DynamicRegistrationForm from "@/components/DynamicRegistrationForm";
import EventDetails from "@/components/EventDetails";
import { adminDb } from "@/lib/admin";
import { eventPhase, eventStartMs } from "@/lib/events";
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
function ClosedNotice({ ended, header }: { ended: boolean; header?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-xl md:p-10">
      {header}
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

/** Phones are below this width; it matches Tailwind's `md` breakpoint. */
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * The 3:1 banner, or on phones the 4:5 mobile banner when one was uploaded.
 * The frame changes shape with the image, so neither version is cropped when it
 * is designed at its recommended size. A <picture> lets the browser download only
 * the version it shows.
 */
function Banner({ event }: { event: EventRecord }) {
  const frame = "relative mt-6 w-full overflow-hidden rounded-2xl shadow-lg";
  const alt = `${event.name} banner`;
  const common = { alt, fill: true, sizes: "(max-width: 896px) 100vw, 896px", className: "object-cover" };
  const desktop = event.bannerUrl;
  const mobile = event.mobileBannerUrl;

  if (desktop && mobile) {
    // On App Hosting images are served unoptimised, so getImageProps returns no
    // srcSet. The <source> then has to point at the plain URL, or browsers skip
    // it and show the mobile image at every width.
    const { props: desktopProps } = getImageProps({ ...common, src: desktop });
    const desktopSrcSet = desktopProps.srcSet || desktopProps.src;
    const { props: mobileProps } = getImageProps({ ...common, src: mobile });
    return (
      <div className={`${frame} aspect-4/5 md:aspect-3/1`}>
        <picture>
          <source media={DESKTOP_QUERY} srcSet={desktopSrcSet} sizes={desktopProps.srcSet ? common.sizes : undefined} />
          <img {...mobileProps} alt={alt} fetchPriority="high" loading="eager" />
        </picture>
      </div>
    );
  }
  // A mobile banner alone would crop badly into the wide frame, so it shows on phones only.
  return (
    <div className={`${frame} ${desktop ? "aspect-3/1" : "aspect-4/5 md:hidden"}`}>
      <Image {...common} alt={alt} src={(desktop || mobile)!} priority />
    </div>
  );
}

export default async function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug); if (!event) notFound();
  const ended = eventPhase(event) === "past";
  // A testing event is never treated as closed: the whole point is that the
  // builder can still submit through it before the real dates are set.
  const closed = event.status !== "testing" && (event.status === "closed" || ended);
  const display = event.registrationDisplay || {};
  const showTitle = display.title !== false;
  const showDescription = display.description !== false && Boolean(event.description);
  const showBanner = display.banner !== false && Boolean(event.bannerUrl || event.mobileBannerUrl);
  // Mirrors EventDetails' own empty check, so an empty header is never drawn.
  const showDetails = display.details !== false && (Boolean(event.venue) || eventStartMs(event) !== null);
  // Title, description, then venue/date/time open the form card rather than sitting above it.
  // `centered` matches the closed notice, which is centre-aligned.
  const header = (centered: boolean) => showTitle || showDescription || showDetails ? (
    <div className="mb-6 space-y-4 border-b border-gray-100 pb-6">
      {showTitle && <h1 className="text-3xl font-bold text-cfg-primary md:text-4xl">{event.name}</h1>}
      {showDescription && <p className="whitespace-pre-line text-gray-700">{event.description}</p>}
      {showDetails && <EventDetails event={event} tone="bare" className={centered ? "justify-center" : ""} />}
    </div>
  ) : null;
  return (
    <main className="min-h-screen bg-cfg-mint px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <Image src="/cfg-logo.png" alt="CFG Africa" width={180} height={69} className="mx-auto h-auto w-40 md:w-44" />
          {showBanner && <Banner event={event} />}
        </div>
        {closed ? <ClosedNotice ended={ended} header={header(true)} /> : <DynamicRegistrationForm event={event} header={header(false)} />}
      </div>
    </main>
  );
}
