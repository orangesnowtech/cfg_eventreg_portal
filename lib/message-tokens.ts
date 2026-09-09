import type { EventRecord } from "@/types/event";

/**
 * Personalisation tokens for admin-composed broadcasts.
 *
 * Tokens are written as [full name] — bracketed and spelled out, because form
 * field ids are generated ("field_2") and no admin would guess them. The label
 * is the token, so the compose box shows what the admin already sees in the
 * form builder.
 *
 * Both halves of this file are shared: the dashboard lists availableTokens() as
 * clickable chips, the broadcast route calls applyTokens() per recipient. They
 * have to agree on spelling, so they live together.
 */

/** The parts of a registration document a token can read. */
export interface TokenSource {
  form?: Record<string, unknown>;
  name?: string;
  email?: string;
  accessCode?: string;
}

export interface MessageToken {
  /** What gets inserted, e.g. "[first name]". */
  token: string;
  /** The field label this stands in for, shown on the picker. */
  label: string;
  /** False when the field is optional, so some registrants render blank. */
  alwaysAnswered: boolean;
}

/** "Email address" -> "email address": what goes inside the brackets. */
export function tokenKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Fields already reachable through a built-in token. The register API copies
 * this answer to the top level of the registration, so offering it twice under
 * a second spelling would only be confusing.
 */
const COVERED_FIELD_IDS = new Set(["email"]);

/** Available on every event, whatever its form collects. */
const BUILT_IN_TOKENS: { key: string; label: string }[] = [
  { key: "name", label: "Full name" },
  { key: "email", label: "Email address" },
  { key: "access code", label: "Access code" },
  { key: "event", label: "Event name" },
];

/** Every token this event's form can fill, in the order the picker shows them. */
export function availableTokens(event: Pick<EventRecord, "form">): MessageToken[] {
  const tokens: MessageToken[] = [];
  const seen = new Set<string>();

  const add = (key: string, label: string, alwaysAnswered: boolean) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    tokens.push({ token: `[${key}]`, label, alwaysAnswered });
  };

  for (const builtIn of BUILT_IN_TOKENS) add(builtIn.key, builtIn.label, true);
  for (const field of event.form?.fields || []) {
    if (COVERED_FIELD_IDS.has(field.id)) continue;
    add(tokenKey(field.label), field.label, field.required);
  }
  return tokens;
}

/**
 * A stand-in registrant for a test send addressed to a named person.
 *
 * Every token still resolves, but to the test recipient's own name and a
 * parenthesised label for anything the form would have collected — so a draft
 * can be shown to a sponsor or a colleague without handing them a real
 * attendee's answers, and the placement of each token is still visible.
 */
export function sampleRegistration(
  event: Pick<EventRecord, "form">,
  name: string,
  email: string
): TokenSource {
  const form: Record<string, unknown> = {};
  for (const field of event.form?.fields || []) form[field.id] = `(${field.label})`;

  const parts = name.trim().split(/\s+/);
  form.firstName = parts[0] || name;
  form.lastName = parts.slice(1).join(" ") || "";
  form.email = email;

  return { name, email, accessCode: "TESTCODE", form };
}

/** One answer as it should read in a sentence. */
function answerToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // Multi-select answers are stored as arrays; "A, B" reads better than "A,B".
  if (Array.isArray(value)) return value.map(answerToText).filter(Boolean).join(", ");
  return String(value);
}

function tokenValues(event: Pick<EventRecord, "name" | "form">, registration: TokenSource) {
  const values = new Map<string, string>();
  // Built-ins are set first so a form field cannot shadow one.
  // "there" matches the fallback the confirmation emails have always used for
  // a registration that arrived without a usable name.
  values.set("name", (registration.name || "").trim() || "there");
  values.set("email", registration.email || "");
  values.set("access code", registration.accessCode || "");
  values.set("event", event.name || "");

  for (const field of event.form?.fields || []) {
    if (COVERED_FIELD_IDS.has(field.id)) continue;
    const key = tokenKey(field.label);
    if (!key || values.has(key)) continue;
    values.set(key, answerToText(registration.form?.[field.id]));
  }
  return values;
}

/**
 * Fills [token] placeholders from one registrant's answers.
 *
 * Only tokens this event actually offers are replaced. Brackets used as ordinary
 * punctuation ("[see attached]") survive untouched, and so does a misspelled
 * token — which is far easier to catch in a test send than a silently blank
 * line would be. Answers are substituted in a single pass and never rescanned,
 * so a registrant who typed "[name]" into a field gets it back verbatim.
 */
export function applyTokens(
  template: string,
  event: Pick<EventRecord, "name" | "form">,
  registration: TokenSource
): string {
  const values = tokenValues(event, registration);
  return template.replace(/\[([^\][\n]+)\]/g, (whole, key: string) => {
    const value = values.get(tokenKey(key));
    return value === undefined ? whole : value;
  });
}
