import type { ReactNode } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import EventVenue from "@/components/EventVenue";
import { eventStartMs } from "@/lib/events";
import type { EventRecord } from "@/types/event";

/**
 * Venue, date and time, each with an icon. Read through eventStartMs and the
 * event's own timezone, as the emails are, so the page shows the time the admin
 * entered rather than the server's clock (App Hosting runs on UTC).
 */
function formatStart(event: EventRecord) {
  const startMs = eventStartMs(event);
  if (startMs === null) return null;
  const timeZone = event.timezone || "Africa/Lagos";
  const start = new Date(startMs);
  try {
    return {
      date: start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }),
      time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }),
    };
  } catch {
    // Unknown timezone identifier: show the date without one rather than nothing.
    return { date: start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) };
  }
}

const TONES = {
  // On the mint page background and on white cards.
  light: { band: "bg-white text-cfg-primary shadow-sm ring-1 ring-cfg-primary/10", badge: "bg-cfg-mint text-cfg-primary" },
  // Inside the navy featured card on the homepage.
  dark: { band: "bg-white/10 text-white ring-1 ring-white/15", badge: "bg-cfg-secondary text-cfg-primary" },
  // No card at all: a plain row inside another card, e.g. under the title on the registration form.
  bare: { band: "text-cfg-primary", badge: "bg-cfg-mint text-cfg-primary" },
};

function Item({ icon, badge, children }: { icon: ReactNode; badge: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badge}`} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 wrap-break-word font-semibold">{children}</span>
    </div>
  );
}

export default function EventDetails({
  event,
  tone = "light",
  compact = false,
  className = "",
}: {
  event: EventRecord;
  tone?: keyof typeof TONES;
  /** Stacked rows for narrow listing cards, instead of one centred band. */
  compact?: boolean;
  className?: string;
}) {
  const when = formatStart(event);
  if (!when && !event.venue) return null;
  const { band, badge } = TONES[tone];
  const iconClass = "h-4 w-4";

  return (
    <div
      className={`rounded-xl ${band} ${
        compact
          ? "flex flex-col gap-2 p-3 text-sm"
          : tone === "bare"
          ? "flex flex-wrap items-center gap-x-6 gap-y-3 text-sm md:text-base"
          : "flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-5 py-4 text-sm md:text-base"
      } ${className}`}
    >
      {event.venue && (
        <Item icon={<MapPin className={iconClass} />} badge={badge}>
          <EventVenue venue={event.venue} />
        </Item>
      )}
      {when && (
        <>
          <Item icon={<CalendarDays className={iconClass} />} badge={badge}>
            <time dateTime={new Date(eventStartMs(event)!).toISOString()}>{when.date}</time>
          </Item>
          <Item icon={<Clock className={iconClass} />} badge={badge}>
            {when.time}
          </Item>
        </>
      )}
    </div>
  );
}
