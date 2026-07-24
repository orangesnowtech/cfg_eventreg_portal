import type { EventRecord } from "@/types/event";

const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";

export interface RegistrationEmailInput {
  event: EventRecord;
  to: string;
  name: string;
  accessCode: string;
  isTest?: boolean;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatWhen(event: EventRecord) {
  if (!event.startAt) return "";
  const date = new Date(event.startAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timezone || "Africa/Lagos",
  });
}

function buildHtml({ event, name, accessCode }: RegistrationEmailInput) {
  const mode = event.accessMode || "code";
  const showCode = mode === "code" || mode === "both";
  const showLink = mode === "link" || mode === "both";
  const when = formatWhen(event);

  const banner = event.bannerUrl
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(event.bannerUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;" /></td></tr>`
    : "";

  const detailRows: [string, string][] = [];
  if (event.venue) detailRows.push(["Venue", event.venue]);
  if (when) detailRows.push(["When", when]);

  const details = detailRows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${label}</td><td style="padding:4px 0;color:#092358;font-size:14px;font-weight:600;">${escapeHtml(String(value))}</td></tr>`
    )
    .join("");

  const codeBlock = showCode
    ? `<tr><td style="padding:24px 32px;text-align:center;">
         <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:600;">YOUR ACCESS CODE</p>
         <p style="margin:0;color:#092358;font-size:38px;font-weight:700;letter-spacing:8px;font-family:monospace;">${escapeHtml(accessCode)}</p>
         <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Have this ready at check-in.</p>
       </td></tr>`
    : "";

  const linkBlock =
    showLink && event.joinUrl
      ? `<tr><td style="padding:24px 32px;text-align:center;">
           <p style="margin:0 0 12px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:600;">JOINING LINK</p>
           <a href="${escapeHtml(event.joinUrl)}" style="display:inline-block;background-color:#27D2A9;color:#092358;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">Join the event</a>
           <p style="margin:14px 0 0;word-break:break-all;"><a href="${escapeHtml(event.joinUrl)}" style="color:#092358;font-size:12px;">${escapeHtml(event.joinUrl)}</a></p>
           ${event.joinInstructions ? `<p style="margin:14px 0 0;color:#4b5563;font-size:13px;">${escapeHtml(event.joinInstructions)}</p>` : ""}
         </td></tr>`
      : "";

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
          ${details ? `<table cellpadding="0" cellspacing="0" width="100%">${details}</table>` : ""}
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
 * Low-level ZeptoMail send. Normalises the auth token (ZeptoMail expects
 * "Zoho-enczapikey <key>"; we tolerate the key being stored with or without that
 * prefix) and returns the provider's actual error text on failure so callers can
 * surface a real reason instead of a generic one. Never throws.
 */
async function deliver(message: {
  to: string;
  name: string;
  subject: string;
  htmlbody: string;
  textbody: string;
}): Promise<SendResult> {
  const rawKey = process.env.ZEPTOMAIL_API_KEY;
  if (!rawKey) return { sent: false, reason: "ZEPTOMAIL_API_KEY is not set in this environment" };
  if (!message.to) return { sent: false, reason: "no recipient address" };

  const token = rawKey.startsWith("Zoho-enczapikey") ? rawKey : `Zoho-enczapikey ${rawKey}`;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "noreply@cfgafrica.com";
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "CFG Africa Events";

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
        to: [{ email_address: { address: message.to, name: message.name } }],
        subject: message.subject,
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
    return { sent: false, reason: error instanceof Error ? error.message : "network or provider error" };
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
  });
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
}): Promise<SendResult> {
  return deliver({
    to: input.to,
    name: input.name,
    subject: input.subject,
    htmlbody: buildBroadcastHtml(input.event, input.name, input.message),
    textbody: `${input.message}\n\n—\n${input.event.name}\nCFG Africa`,
  });
}

function buildBroadcastHtml(event: EventRecord, name: string, message: string) {
  // Admin-entered text: escape it, then turn newlines into breaks so paragraphs survive.
  const body = escapeHtml(message).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E0FAF4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E0FAF4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        <tr><td style="background-color:#092358;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#27D2A9;font-size:12px;letter-spacing:2px;font-weight:700;">CFG AFRICA</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">${escapeHtml(event.name)}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#092358;font-size:16px;">Hello ${escapeHtml(name)},</p>
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
