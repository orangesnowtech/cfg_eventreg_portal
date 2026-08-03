/**
 * draft    — not reachable publicly, still being built
 * testing  — reachable by direct link only; submissions are marked as tests and
 *            do not lock the form, so the builder can still be corrected
 * published— live and collecting real registrations
 * closed   — no longer accepting registrations, still listed publicly
 */
export type EventStatus = "draft" | "testing" | "published" | "closed";
/**
 * What an attendee receives on registering:
 * code — an access code to present at in-person check-in
 * link — a joining link for a virtual event or webinar
 * both — hybrid events that need a code on the door and a link to stream
 */
export type EventAccessMode = "code" | "link" | "both";

export type EventFieldType = "text" | "email" | "phone" | "url" | "textarea" | "select" | "radio" | "checkbox" | "date" | "number";

export interface EventField {
  id: string;
  label: string;
  type: EventFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface EventForm {
  title: string;
  introText?: string;
  successMessage?: string;
  fields: EventField[];
}

export interface EventRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  venue?: string;
  startAt?: string;
  endAt?: string;
  status: EventStatus;
  /** Only one event is featured on the homepage at a time. */
  featured?: boolean;
  form: EventForm;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  /** Banner or flyer shown on the homepage, listing, and registration page. */
  bannerUrl?: string;
  /** Defaults to "code" when unset, matching how earlier events behaved. */
  accessMode?: EventAccessMode;
  /** Webinar or meeting link; required when accessMode includes a link. */
  joinUrl?: string;
  /** Extra joining notes shown with the link, e.g. a passcode or dial-in. */
  joinInstructions?: string;
  /**
   * Automatic countdown reminder emails. Undefined means enabled: events created
   * before reminders existed still get them once they are published and dated.
   */
  remindersEnabled?: boolean;
  /** Populated by the admin events listing; absent on the public payload. */
  registrationCount?: number;
  /** Test submissions collected while the event was in testing. */
  testCount?: number;
}

export interface RegistrationRecord {
  id: string;
  eventId: string;
  form: Record<string, unknown>;
  email?: string;
  name?: string;
  accessCode: string;
  /** True when submitted while the event was in testing; purged on publish. */
  isTest?: boolean;
  checkedIn: boolean;
  registeredAt: string;
  checkedInAt?: string | null;
}
