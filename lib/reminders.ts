import { adminDb } from "@/lib/admin";
import { sendReminderEmail } from "@/lib/email";
import { eventStartMs } from "@/lib/events";
import type { EventRecord } from "@/types/event";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface ReminderMilestone {
  /** Stable id; also the Firestore doc id that records the send. */
  key: string;
  /** How long before the start this reminder is meant to go out. */
  ms: number;
  label: string;
}

/**
 * The countdown schedule, most urgent first. The order matters: a sweep always
 * picks the first milestone whose moment has already passed, so a run that is
 * late (or an event created inside the window) sends the reminder that matches
 * the time actually remaining instead of replaying every earlier one.
 */
export const REMINDER_MILESTONES: ReminderMilestone[] = [
  { key: "5m", ms: 5 * MINUTE, label: "5 minutes before" },
  { key: "1h", ms: HOUR, label: "1 hour before" },
  { key: "3h", ms: 3 * HOUR, label: "3 hours before" },
  { key: "24h", ms: DAY, label: "24 hours before" },
  { key: "3d", ms: 3 * DAY, label: "3 days before" },
];

/**
 * Reminders stop this close to the start. Inside the final minute the mail can no
 * longer arrive in time to be useful, and an attendee who is already at the door
 * should not be told the event "starts in 5 minutes".
 */
const MIN_LEAD_MS = MINUTE;

/** How many sends run at once, matching the pacing used for admin broadcasts. */
const BATCH_SIZE = 5;

/** The reminder that is due now, or null if none is. */
export function dueMilestone(startMs: number, now: number): ReminderMilestone | null {
  if (now > startMs - MIN_LEAD_MS) return null;
  return REMINDER_MILESTONES.find((milestone) => now >= startMs - milestone.ms) || null;
}

/** "in 3 days" / "in 24 hours" / "in 5 minutes", from the real time remaining. */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs >= 36 * HOUR) {
    const days = Math.round(remainingMs / DAY);
    return days === 1 ? "in 1 day" : `in ${days} days`;
  }
  // The thresholds sit just below each unit so a sweep that runs a minute or two
  // after the 1-hour mark still says "in 1 hour" rather than "in 58 minutes".
  if (remainingMs >= 55 * MINUTE) {
    const hours = Math.round(remainingMs / HOUR);
    return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
  }
  if (remainingMs >= MINUTE) {
    const minutes = Math.round(remainingMs / MINUTE);
    return minutes === 1 ? "in 1 minute" : `in ${minutes} minutes`;
  }
  return "in under a minute";
}

export interface ReminderDispatch {
  eventId: string;
  eventName: string;
  milestone: string;
  countdown: string;
  recipients: number;
  sent: number;
  failed: number;
}

export interface ReminderSweep {
  checked: number;
  dispatched: ReminderDispatch[];
  /** Milestones that were due but had no one to mail, kept for the run log. */
  skipped: { eventId: string; milestone: string; reason: string }[];
}

/** Firestore's "document already exists" — another sweep got this milestone first. */
function isAlreadyClaimed(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (code === 6 || code === "already-exists") return true;
  return error instanceof Error && error.message.includes("ALREADY_EXISTS");
}

/**
 * Sends one milestone's reminder to every real registrant of an event.
 * Never throws: a provider failure is counted, not propagated, so one bad address
 * cannot stop the rest of the list or the rest of the sweep.
 */
async function mailRegistrants(
  event: EventRecord,
  countdown: string,
  startsAtMs: number
): Promise<{ recipients: number; sent: number; failed: number }> {
  const snapshot = await adminDb.collection("registrations").where("eventId", "==", event.id).get();
  const recipients = snapshot.docs
    .map((doc) => doc.data())
    .filter((reg) => !reg.isTest && typeof reg.email === "string" && reg.email);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const results = await Promise.all(
      recipients.slice(i, i + BATCH_SIZE).map((reg) =>
        sendReminderEmail({
          event,
          to: reg.email,
          name: reg.name || "there",
          accessCode: reg.accessCode || "",
          countdown,
          startsAtMs,
        })
      )
    );
    for (const result of results) {
      if (result.sent) sent += 1;
      else failed += 1;
    }
  }
  return { recipients: recipients.length, sent, failed };
}

/**
 * Walks every published event and sends whichever countdown reminder is due.
 *
 * Each milestone is claimed by creating events/{id}/reminders/{key} before any
 * mail goes out; create() fails if the document exists, so a milestone is sent
 * exactly once even if two sweeps overlap or the scheduler retries.
 */
export async function runReminderSweep(now: number = Date.now()): Promise<ReminderSweep> {
  const snapshot = await adminDb.collection("events").where("status", "==", "published").get();
  const dispatched: ReminderDispatch[] = [];
  const skipped: ReminderSweep["skipped"] = [];

  for (const doc of snapshot.docs) {
    const event = { id: doc.id, ...doc.data() } as EventRecord;
    if (event.remindersEnabled === false) continue;

    const startMs = eventStartMs(event);
    if (startMs === null) continue;

    const milestone = dueMilestone(startMs, now);
    if (!milestone) continue;

    const claim = doc.ref.collection("reminders").doc(milestone.key);
    try {
      await claim.create({
        milestone: milestone.key,
        label: milestone.label,
        dueAt: new Date(startMs - milestone.ms).toISOString(),
        claimedAt: new Date(now).toISOString(),
        status: "sending",
      });
    } catch (error) {
      if (isAlreadyClaimed(error)) continue;
      throw error;
    }

    const countdown = formatCountdown(startMs - now);
    const outcome = await mailRegistrants(event, countdown, startMs);

    await claim.set(
      {
        status: outcome.recipients === 0 ? "no_recipients" : "sent",
        countdown,
        recipients: outcome.recipients,
        sent: outcome.sent,
        failed: outcome.failed,
        completedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (outcome.recipients === 0) {
      skipped.push({ eventId: event.id, milestone: milestone.key, reason: "no registrants with an email address" });
      continue;
    }

    dispatched.push({
      eventId: event.id,
      eventName: event.name,
      milestone: milestone.key,
      countdown,
      ...outcome,
    });

    await adminDb.collection("activityLogs").add({
      type: "reminder_sent",
      eventId: event.id,
      performedBy: "system",
      details: `${milestone.label} reminder (${countdown}) sent to ${outcome.sent} of ${outcome.recipients} registrant(s)${outcome.failed ? `; ${outcome.failed} failed` : ""}`,
      timestamp: new Date().toISOString(),
    });
  }

  return { checked: snapshot.size, dispatched, skipped };
}
