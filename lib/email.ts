import type { EventRecord } from "@/types/event";
import { eventStartMs } from "@/lib/events";

const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";

export interface RegistrationEmailInput {
  event: EventRecord;
  to: string;
  name: string;
  accessCode: string;
  isTest?: boolean;
}

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatWhen(event: EventRecord) {
  // Read through eventStartMs so a start stored without a zone is anchored to the
  // event's own timezone, and the printed time is the one the admin entered.
  const startMs = eventStartMs(event);
  if (startMs === null) return "";
  return new Date(startMs).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timezone || "Africa/Lagos",
  });
}

/** Banner row, empty when the event has no artwork. Shared by every template. */
function bannerRow(event: EventRecord) {
  return event.bannerUrl
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(event.bannerUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;" /></td></tr>`
    : "";
}

/** Venue and start time as a two-column table, or "" when neither is known. */
function detailsTable(event: EventRecord) {
  const when = formatWhen(event);
  const detailRows: [string, string][] = [];
  if (event.venue) detailRows.push(["Venue", event.venue]);
  if (when) detailRows.push(["When", when]);

  const details = detailRows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${label}</td><td style="padding:4px 0;color:#092358;font-size:14px;font-weight:600;">${escapeHtml(String(value))}</td></tr>`
    )
    .join("");

  return details ? `<table cellpadding="0" cellspacing="0" width="100%">${details}</table>` : "";
}

/** The access code and joining link rows an event's access mode calls for. */
function accessRows(event: EventRecord, accessCode: string) {
  const mode = event.accessMode || "code";
  const showCode = (mode === "code" || mode === "both") && Boolean(accessCode);
  const showLink = (mode === "link" || mode === "both") && Boolean(event.joinUrl);

  const codeBlock = showCode
    ? `<tr><td style="padding:24px 32px;text-align:center;">
         <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:600;">YOUR ACCESS CODE</p>
         <p style="margin:0;color:#092358;font-size:38px;font-weight:700;letter-spacing:8px;font-family:monospace;">${escapeHtml(accessCode)}</p>
         <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Have this ready at check-in.</p>
       </td></tr>`
    : "";

  const linkBlock = showLink
    ? `<tr><td style="padding:24px 32px;text-align:center;">
           <p style="margin:0 0 12px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:600;">JOINING LINK</p>
           <a href="${escapeHtml(event.joinUrl!)}" style="display:inline-block;background-color:#27D2A9;color:#092358;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">Join the event</a>
           <p style="margin:14px 0 0;word-break:break-all;"><a href="${escapeHtml(event.joinUrl!)}" style="color:#092358;font-size:12px;">${escapeHtml(event.joinUrl!)}</a></p>
           ${event.joinInstructions ? `<p style="margin:14px 0 0;color:#4b5563;font-size:13px;">${escapeHtml(event.joinInstructions)}</p>` : ""}
         </td></tr>`
    : "";

  return { codeBlock, linkBlock };
}

function buildHtml({ event, name, accessCode }: RegistrationEmailInput) {
  const banner = bannerRow(event);
  const details = detailsTable(event);
  const { codeBlock, linkBlock } = accessRows(event, accessCode);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E0FAF4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E0FAF4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        ${banner}
        <tr><td style="background-color:#092358;padding:32px;text-align:center;">
          <p style="margin:0;color:#27D2A9;font-size:12px;letter-spacing:2px;font-weight:700;">CFG AFRICA</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">${escapeHtml(event.name)}</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 16px;color:#092358;font-size:16px;">Hello ${escapeHtml(name)},</p>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
            Your registration is confirmed. The details are below — keep this email for your records.
          </p>
          ${details}
        </td></tr>
        ${codeBlock}
        ${linkBlock}
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:12px;">Questions? Contact <a href="mailto:events@cfgafrica.com" style="color:#092358;">events@cfgafrica.com</a></p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">© 2026 CFG Africa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText({ event, name, accessCode }: RegistrationEmailInput) {
  const mode = event.accessMode || "code";
  const when = formatWhen(event);
  const lines = [
    `${event.name}`,
    "",
    `Hello ${name},`,
    "",
    "Your registration is confirmed.",
    "",
  ];
  if (event.venue) lines.push(`Venue: ${event.venue}`);
  if (when) lines.push(`When: ${when}`);
  if (mode === "code" || mode === "both") {
    lines.push("", `YOUR ACCESS CODE: ${accessCode}`, "Have this ready at check-in.");
  }
  if ((mode === "link" || mode === "both") && event.joinUrl) {
    lines.push("", `JOINING LINK: ${event.joinUrl}`);
    if (event.joinInstructions) lines.push(event.joinInstructions);
  }
  lines.push("", "Questions? Contact events@cfgafrica.com", "© 2026 CFG Africa");
  return lines.join("\n");
}

export interface SendResult {
  sent: boolean;
  reason?: string;
}

/**
 * Strips anything that must never reach a mail header.
 *
 * A stray CR or LF is easy to introduce without noticing — pasted into an
 * event's sender name, or left on the end of a secret written from a file — and
 * it shows up as a mangled From line at best and header injection at worst.
 * Every value that becomes a header goes through here, whatever its source.
 */
function headerSafe(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

/** Addresses get the same treatment, but with no spaces left at all. */
function addressSafe(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, "");
}

/**
 * What each network-level failure actually means, in words an admin reading the
 * dashboard can act on.
 */
const NETWORK_HINTS: Record<string, string> = {
  EAI_AGAIN: "DNS lookup failed — the mail host could not be resolved",
  ENOTFOUND: "DNS lookup failed — the mail host could not be resolved",
  ECONNREFUSED: "the connection was refused",
  ECONNRESET: "the connection was reset mid-request",
  ETIMEDOUT: "the connection timed out",
  UND_ERR_CONNECT_TIMEOUT: "the connection timed out",
  CERT_HAS_EXPIRED: "the TLS certificate has expired",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:
    "the TLS certificate could not be verified — a proxy may be intercepting HTTPS",
  SELF_SIGNED_CERT_IN_CHAIN:
    "the TLS certificate could not be verified — a proxy may be intercepting HTTPS",
};

/**
 * Node's fetch reports every network-level failure as the same bare "fetch
 * failed" and hides the real problem on error.cause, which leaves whoever hit
 * Send staring at a message that says nothing. Unwrap it so the reason names
 * itself.
 */
function describeSendError(error: unknown): string {
  if (!(error instanceof Error)) return "network or provider error";
  const cause = error.cause as { code?: string } | undefined;
  if (!cause?.code) return error.message;
  const hint = NETWORK_HINTS[cause.code];
  return hint ? `${error.message} — ${hint} (${cause.code})` : `${error.message} (${cause.code})`;
}

/**
 * Low-level ZeptoMail send. Normalises the auth token (ZeptoMail expects
 * "Zoho-enczapikey <key>"; we tolerate the key being stored with or without that
 * prefix) and returns the provider's actual error text on failure so callers can
 * surface a real reason instead of a generic one. Never throws.
 */
export async function deliver(message: {
  to: string;
  name: string;
  subject: string;
  htmlbody: string;
  textbody: string;
  /** Overrides the sender name for this send only; blank or absent uses the default. */
  fromName?: string;
}): Promise<SendResult> {
  const rawKey = process.env.ZEPTOMAIL_API_KEY;
  if (!rawKey) return { sent: false, reason: "ZEPTOMAIL_API_KEY is not set in this environment" };
  if (!message.to) return { sent: false, reason: "no recipient address" };

  const token = rawKey.startsWith("Zoho-enczapikey") ? rawKey : `Zoho-enczapikey ${rawKey}`;
  const fromEmail = addressSafe(process.env.ZEPTOMAIL_FROM_EMAIL) || "noreply@cfgafrica.com";
  // Both sources are cleaned, not just the per-event override: the environment
  // value arrives from Secret Manager, where a trailing newline is invisible.
  const fromName =
    headerSafe(message.fromName) || headerSafe(process.env.ZEPTOMAIL_FROM_NAME) || "CFG Africa Events";

  try {
    const response = await fetch(ZEPTOMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: addressSafe(message.to), name: headerSafe(message.name) } }],
        subject: headerSafe(message.subject),
        htmlbody: message.htmlbody,
        textbody: message.textbody,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("ZeptoMail rejected the message:", response.status, detail);
      return { sent: false, reason: `provider returned ${response.status}: ${detail}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("Email failed to send:", error);
    return { sent: false, reason: describeSendError(error) };
  }
}

/**
 * Sends the registration confirmation for any event, shaped by that event's own
 * access mode. Never throws: a failed send must not fail the registration that
 * has already been written, so callers get a result object instead.
 */
export async function sendRegistrationEmail(input: RegistrationEmailInput): Promise<SendResult> {
  // Test-mode sends are clearly marked so a trial run is never mistaken for the real thing.
  const subject = `${input.isTest ? "[TEST] " : ""}Registration confirmed — ${input.event.name}`;
  return deliver({
    to: input.to,
    name: input.name,
    subject,
    htmlbody: buildHtml(input),
    textbody: buildText(input),
    fromName: input.event.emailFromName,
  });
}

export interface ApplicationEmailInput {
  /** The programme record the application was submitted against. */
  programme: EventRecord;
  to: string;
  name: string;
  /** Quoted back if the applicant needs to ask about their submission. */
  reference: string;
  isTest?: boolean;
}

/**
 * Confirmation for a programme application.
 *
 * Deliberately not the registration template: there is no venue, no start time
 * and nothing to check into, so the applicant gets a reference number and a plain
 * statement of what happens next instead of an access code they cannot use.
 */
export async function sendApplicationEmail(input: ApplicationEmailInput): Promise<SendResult> {
  const { programme, name, reference, isTest } = input;
  const nextSteps =
    "We review every application after the intake closes. Shortlisted applicants are contacted on the WhatsApp number they provided, with the training dates.";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E0FAF4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E0FAF4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        ${bannerRow(programme)}
        <tr><td style="background-color:#092358;padding:32px;text-align:center;">
          <p style="margin:0;color:#27D2A9;font-size:12px;letter-spacing:2px;font-weight:700;">CFG AFRICA</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">${escapeHtml(programme.name)}</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 16px;color:#092358;font-size:16px;">Hello ${escapeHtml(name)},</p>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
            We have received your application. Nothing further is needed from you right now.
          </p>
          <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.6;">${nextSteps}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:600;">YOUR APPLICATION REFERENCE</p>
          <p style="margin:0;color:#092358;font-size:30px;font-weight:700;letter-spacing:4px;font-family:monospace;">${escapeHtml(reference)}</p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Quote this if you need to ask us about your application.</p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:12px;">Questions? Contact <a href="mailto:events@cfgafrica.com" style="color:#092358;">events@cfgafrica.com</a></p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">© 2026 CFG Africa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    programme.name,
    "",
    `Hello ${name},`,
    "",
    "We have received your application. Nothing further is needed from you right now.",
    "",
    nextSteps,
    "",
    `YOUR APPLICATION REFERENCE: ${reference}`,
    "Quote this if you need to ask us about your application.",
    "",
    "Questions? Contact events@cfgafrica.com",
    "© 2026 CFG Africa",
  ].join("\n");

  return deliver({
    to: input.to,
    name,
    subject: `${isTest ? "[TEST] " : ""}Application received — ${programme.name}`,
    htmlbody: html,
    textbody: text,
    fromName: programme.emailFromName,
  });
}

export interface ReminderEmailInput {
  event: EventRecord;
  to: string;
  name: string;
  accessCode: string;
  /** Human countdown for the real time remaining, e.g. "in 3 days". */
  countdown: string;
  /** Resolved start instant, used only to decide how urgent the wording is. */
  startsAtMs: number;
}

/**
 * Countdown reminder for an upcoming event. Repeats the access code or joining
 * link so an attendee never has to hunt for the original confirmation, and leads
 * with the time remaining rather than a fixed milestone name.
 */
export async function sendReminderEmail(input: ReminderEmailInput): Promise<SendResult> {
  return deliver({
    to: input.to,
    name: input.name,
    subject: `Reminder: ${input.event.name} starts ${input.countdown}`,
    htmlbody: buildReminderHtml(input),
    textbody: buildReminderText(input),
    fromName: input.event.emailFromName,
  });
}

/** Wording that tightens as the event approaches. */
function reminderIntro(event: EventRecord, remainingMs: number) {
  const isVirtual = (event.accessMode || "code") === "link";
  if (remainingMs <= 15 * 60_000) {
    return isVirtual
      ? "We are about to begin. Use the link below to join now."
      : "We are about to begin. Head to the venue and have your access code ready.";
  }
  if (remainingMs <= 4 * 60 * 60_000) {
    return isVirtual
      ? "Your event starts shortly. Everything you need to join is below."
      : "Your event starts shortly. Everything you need for check-in is below.";
  }
  return "This is a reminder that you are registered. The details are below.";
}

function buildReminderHtml(input: ReminderEmailInput) {
  const { event, name, accessCode, countdown, startsAtMs } = input;
  const banner = bannerRow(event);
  const details = detailsTable(event);
  const { codeBlock, linkBlock } = accessRows(event, accessCode);
  const intro = reminderIntro(event, startsAtMs - Date.now());

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E0FAF4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E0FAF4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        ${banner}
        <tr><td style="background-color:#092358;padding:32px;text-align:center;">
          <p style="margin:0;color:#27D2A9;font-size:12px;letter-spacing:2px;font-weight:700;">CFG AFRICA</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">${escapeHtml(event.name)}</h1>
          <p style="margin:14px 0 0;color:#27D2A9;font-size:16px;font-weight:700;">Starts ${escapeHtml(countdown)}</p>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 16px;color:#092358;font-size:16px;">Hello ${escapeHtml(name)},</p>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
          ${details}
        </td></tr>
        ${codeBlock}
        ${linkBlock}
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:12px;">Can no longer make it? Let us know at <a href="mailto:events@cfgafrica.com" style="color:#092358;">events@cfgafrica.com</a></p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">© 2026 CFG Africa</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildReminderText({ event, name, accessCode, countdown, startsAtMs }: ReminderEmailInput) {
  const mode = event.accessMode || "code";
  const when = formatWhen(event);
  const lines = [
    `${event.name} starts ${countdown}`,
    "",
    `Hello ${name},`,
    "",
    reminderIntro(event, startsAtMs - Date.now()),
    "",
  ];
  if (event.venue) lines.push(`Venue: ${event.venue}`);
  if (when) lines.push(`When: ${when}`);
  if ((mode === "code" || mode === "both") && accessCode) {
    lines.push("", `YOUR ACCESS CODE: ${accessCode}`, "Have this ready at check-in.");
  }
  if ((mode === "link" || mode === "both") && event.joinUrl) {
    lines.push("", `JOINING LINK: ${event.joinUrl}`);
    if (event.joinInstructions) lines.push(event.joinInstructions);
  }
  lines.push("", "Can no longer make it? Let us know at events@cfgafrica.com", "© 2026 CFG Africa");
  return lines.join("\n");
}

/**
 * Sends an admin-composed message to one registrant of an event. The body is
 * plain text entered by the admin, wrapped in the event's branding.
 */
export async function sendBroadcastEmail(input: {
  event: EventRecord;
  to: string;
  name: string;
  subject: string;
  message: string;
  /**
   * Set only for a test send to the admin themselves: a strip above the message
   * saying whose answers filled the tokens, so a preview can never be mistaken
   * for the real thing sitting in an inbox.
   */
  previewNotice?: string;
}): Promise<SendResult> {
  return deliver({
    to: input.to,
    name: input.name,
    subject: input.subject,
    htmlbody: buildBroadcastHtml(input.event, input.message, input.previewNotice),
    textbody: `${input.previewNotice ? `${input.previewNotice}\n\n` : ""}${input.message}\n\n—\n${input.event.name}\nCFG Africa`,
    fromName: input.event.emailFromName,
  });
}

/**
 * No greeting is added here. The admin writes the whole message, greeting
 * included, so the compose box shows exactly what is sent — see the tokens in
 * lib/message-tokens.ts, which are already resolved by the time this runs.
 */
function buildBroadcastHtml(event: EventRecord, message: string, previewNotice?: string) {
  // Admin-entered text: escape it, then turn newlines into breaks so paragraphs survive.
  const body = escapeHtml(message).replace(/\n/g, "<br/>");
  const previewRow = previewNotice
    ? `<tr><td style="background-color:#FEF3C7;padding:12px 32px;border-bottom:1px solid #FDE68A;">
          <p style="margin:0;color:#92400E;font-size:12px;font-weight:700;">${escapeHtml(previewNotice)}</p>
        </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E0FAF4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E0FAF4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        ${previewRow}
        <tr><td style="background-color:#092358;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#27D2A9;font-size:12px;letter-spacing:2px;font-weight:700;">CFG AFRICA</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">${escapeHtml(event.name)}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="color:#374151;font-size:15px;line-height:1.7;">${body}</div>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 CFG Africa · <a href="mailto:events@cfgafrica.com" style="color:#092358;">events@cfgafrica.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
