import { adminDb } from "@/lib/admin";
import type { EventRecord } from "@/types/event";

export type EventPhase = "past" | "present" | "upcoming";

/**
 * Events that are visible publicly: open ones plus closed ones, which stay
 * listed so the archive of past events is complete. Drafts never appear.
 */
export async function getPublicEvents(): Promise<EventRecord[]> {
  const snapshot = await adminDb
    .collection("events")
    .where("status", "in", ["published", "closed"])
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as EventRecord);
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
