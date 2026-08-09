import { adminDb } from "@/lib/admin";
import type { EventRecord } from "@/types/event";

export type EventPhase = "past" | "present" | "upcoming";

/**
 * Events that are visible publicly: open ones plus closed ones, which stay
 * listed so the archive of past events is complete. Drafts never appear.
 *
 * Programmes share this collection but are not events — they have no date to
 * attend and no place in an events archive — so they are filtered out here,
 * which keeps them off both the /events listing and the homepage feature slot.
 * They are reached only by their own /programmes/[slug] link.
 */
export async function getPublicEvents(): Promise<EventRecord[]> {
  const snapshot = await adminDb
    .collection("events")
    .where("status", "in", ["published", "closed"])
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as EventRecord)
    .filter((record) => record.kind !== "programme");
}

/** True when a datetime string already carries a zone, e.g. "...Z" or "...+01:00". */
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** How far the given zone is ahead of UTC at that instant, in milliseconds. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  // hour12:false renders midnight as "24" in some runtimes, hence the modulo.
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asIfUtc - instantMs;
}

/**
 * The event's start as a real instant.
 *
 * The builder stores what a datetime-local input produced ("2026-03-04T09:30"),
 * which carries no zone, so it must be read in the event's own timezone rather
 * than the server's — otherwise a Lagos event scheduled for 09:30 is treated as
 * 09:30 UTC and everything timed off it lands an hour out. Strings that do carry
 * a zone are trusted as-is. Returns null when there is nothing to time against.
 */
export function eventStartMs(event: EventRecord): number | null {
  const raw = (event.startAt || "").trim();
  if (!raw) return null;

  if (HAS_ZONE.test(raw)) {
    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  const asUtc = Date.parse(`${raw}Z`);
  if (Number.isNaN(asUtc)) return null;

  const timeZone = event.timezone || "Africa/Lagos";
  try {
    // Two passes so a start that sits just across a DST change resolves correctly.
    const firstPass = asUtc - zoneOffsetMs(asUtc, timeZone);
    return asUtc - zoneOffsetMs(firstPass, timeZone);
  } catch {
    // Unknown timezone identifier: fall back to reading the value as UTC.
    return asUtc;
  }
}

/**
 * An event with no end time is treated as running until the end of its start day,
 * so a single-day event does not flip to "past" the moment it begins.
 */
export function eventEndsAt(event: EventRecord): number | null {
  if (event.endAt) return new Date(event.endAt).getTime();
  if (!event.startAt) return null;
  const end = new Date(event.startAt);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function eventPhase(event: EventRecord, now: number = Date.now()): EventPhase {
  const start = event.startAt ? new Date(event.startAt).getTime() : null;
  const end = eventEndsAt(event);
  // Undated events have nothing to count down to, so they sit with the upcoming ones.
  if (start === null) return "upcoming";
  if (now < start) return "upcoming";
  if (end !== null && now > end) return "past";
  return "present";
}

export function sortByStart(events: EventRecord[], direction: "asc" | "desc") {
  return [...events].sort((a, b) => {
    const left = a.startAt ? new Date(a.startAt).getTime() : 0;
    const right = b.startAt ? new Date(b.startAt).getTime() : 0;
    return direction === "asc" ? left - right : right - left;
  });
}

/**
 * The homepage headline event: whichever published event an admin has flagged,
 * falling back to the next one starting so the homepage is never empty.
 */
export async function getFeaturedEvent(): Promise<{
  event: EventRecord;
  phase: EventPhase;
  open: boolean;
} | null> {
  const events = (await getPublicEvents()).filter((event) => event.status === "published");
  if (events.length === 0) return null;

  const now = Date.now();
  const flagged = events.find((event) => event.featured);
  const upcoming = sortByStart(
    events.filter((event) => eventPhase(event, now) !== "past"),
    "asc"
  );
  const event = flagged || upcoming[0] || sortByStart(events, "desc")[0];
  if (!event) return null;

  const phase = eventPhase(event, now);
  return { event, phase, open: phase !== "past" };
}

/** Public events bucketed by phase, ready to render. */
export async function getGroupedPublicEvents(): Promise<{
  present: EventRecord[];
  upcoming: EventRecord[];
  past: EventRecord[];
  total: number;
}> {
  const events = await getPublicEvents();
  const now = Date.now();
  const inPhase = (phase: EventPhase) => events.filter((event) => eventPhase(event, now) === phase);

  return {
    present: inPhase("present"),
    upcoming: sortByStart(inPhase("upcoming"), "asc"),
    past: sortByStart(inPhase("past"), "desc"),
    total: events.length,
  };
}
