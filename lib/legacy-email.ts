import type { Guest } from "@/types/guest";
import { formatGuestName } from "@/types/guest";
import { deliver, escapeHtml, type SendResult } from "@/lib/email";

/**
 * Templates for the original single-event forum, which stores attendees in the
 * `guests` collection. The multi-event system in lib/email.ts supersedes these;
 * they live on only for the legacy /api/register and /api/check-in flows.
 *
 * These were previously served by the public /api/send-confirmation and
 * /api/send-welcome routes, which any caller could POST an arbitrary recipient
 * to. Reaching the templates now requires calling into this module from server
 * code, so the recipient is always one this app looked up itself.
 */

/** Shared chrome so both legacy templates stay visually identical. */
function wrap(subtitle: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subtitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #E0FAF4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #E0FAF4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(9, 35, 88, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #092358; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-family: Georgia, serif; font-weight: normal;">CFG Africa</h1>
              <p style="margin: 10px 0 0 0; color: #E0FAF4; font-size: 16px; font-weight: 500;">${escapeHtml(subtitle)}</p>
            </td>
          </tr>

          <!-- Signature Line -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 3px; background: linear-gradient(90deg, #27D2A9 0%, #58C8E7 100%);"></div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #E0FAF4; padding: 25px 30px; text-align: center; border-top: 3px solid transparent; border-image: linear-gradient(90deg, #27D2A9 0%, #58C8E7 100%) 1;">
              <p style="margin: 0; color: #092358; font-size: 12px; font-weight: 500;">
                © 2026 CFG Africa. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #092358; font-size: 12px;">
                Visit us at <a href="https://cfgafrica.com" style="color: #27D2A9; text-decoration: none; font-weight: 600;">cfgafrica.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Registration confirmation carrying the guest's access code. */
export async function sendGuestConfirmationEmail(guest: Guest): Promise<SendResult> {
  const name = formatGuestName(guest);
  const row = (label: string, value: string) =>
    `<tr>
                  <td style="padding: 8px 0; color: #092358; font-size: 14px; font-weight: 600; border-bottom: 1px solid #E0FAF4;">${label}</td>
                  <td style="padding: 8px 0; color: #333333; font-size: 14px; border-bottom: 1px solid #E0FAF4;">${escapeHtml(value)}</td>
                </tr>`;

  const html = wrap(
    "Event Registration Confirmation",
    `              <h2 style="margin: 0 0 20px 0; color: #092358; font-size: 24px; font-family: Georgia, serif;">Welcome, ${escapeHtml(name)}!</h2>

              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for registering for our upcoming event. We're excited to have you join us!
              </p>

              <div style="background-color: rgba(39, 210, 169, 0.08); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #27D2A9;">
                <h3 style="margin: 0 0 15px 0; color: #092358; font-size: 20px; font-family: Georgia, serif;">CFG Africa Non-Interest Investment Forum</h3>
                <p style="margin: 0 0 8px 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  <strong style="color: #092358;">Theme:</strong> Unlocking Africa's Potential Through Ethical Finance
                </p>
                <p style="margin: 0 0 8px 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  <strong style="color: #092358;">📍 Venue:</strong> Nordic Hotel Jabi, Abuja
                </p>
                <p style="margin: 0 0 8px 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  <strong style="color: #092358;">📅 Date:</strong> Wednesday, February 5th, 2026
                </p>
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  <strong style="color: #092358;">🕐 Time:</strong> 10:00 AM
                </p>
              </div>

              <div style="background: linear-gradient(135deg, rgba(39, 210, 169, 0.1) 0%, rgba(88, 200, 231, 0.1) 100%); border: 2px solid #27D2A9; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #092358; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Access Code</p>
                <p style="margin: 0; color: #092358; font-size: 36px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 6px;">
                  ${escapeHtml(guest.accessCode)}
                </p>
                <p style="margin: 15px 0 0 0; color: #333333; font-size: 14px;">
                  Please keep this code safe. You'll need it to check in at the event.
                </p>
              </div>

              <h3 style="margin: 30px 0 15px 0; color: #092358; font-size: 18px; font-family: Georgia, serif;">Registration Details</h3>

              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                ${row("Name:", name)}
                ${row("Email:", guest.email)}
                ${row("Organization:", guest.organizationName)}
                ${row("Guest Type:", guest.guestType)}
              </table>

              <div style="background-color: rgba(88, 200, 231, 0.15); border-left: 4px solid #58C8E7; border-radius: 4px; padding: 15px; margin: 30px 0;">
                <p style="margin: 0; color: #092358; font-size: 14px; line-height: 1.6;">
                  <strong>Important:</strong> Please arrive 15 minutes early for check-in. Bring this email or have your access code ready.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; color: #333333; font-size: 14px; line-height: 1.6;">
                If you have any questions, please contact us at <a href="mailto:events@cfgafrica.com" style="color: #27D2A9; text-decoration: none; font-weight: 600;">events@cfgafrica.com</a>
              </p>`
  );

  const text = `CFG Africa Event Registration Confirmation

Welcome, ${name}!

Thank you for registering for our upcoming event. We're excited to have you join us!

EVENT DETAILS:
CFG Africa Non-Interest Investment Forum
Theme: Unlocking Africa's Potential Through Ethical Finance
Venue: Nordic Hotel Jabi, Abuja
Date: Wednesday, February 5th, 2026
Time: 10:00 AM

YOUR ACCESS CODE: ${guest.accessCode}

Please keep this code safe. You'll need it to check in at the event.

Registration Details:
- Name: ${name}
- Email: ${guest.email}
- Organization: ${guest.organizationName}
- Guest Type: ${guest.guestType}

IMPORTANT: Please arrive 15 minutes early for check-in. Bring this email or have your access code ready.

If you have any questions, please contact us at events@cfgafrica.com

© 2026 CFG Africa. All rights reserved.
Visit us at https://cfgafrica.com`;

  return deliver({
    to: guest.email,
    name,
    subject: "CFG Event Registration Confirmation",
    htmlbody: html,
    textbody: text,
  });
}

/** Sent once a guest has been checked in at the door. */
export async function sendGuestWelcomeEmail(guest: Guest): Promise<SendResult> {
  const name = formatGuestName(guest);

  const html = wrap(
    "Welcome to the Event!",
    `              <h2 style="margin: 0 0 20px 0; color: #092358; font-size: 28px; font-family: Georgia, serif;">Welcome, ${escapeHtml(name)}! 🎉</h2>

              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for joining us at the <strong>CFG Africa Non-Interest Investment Forum</strong>. We're delighted to have you here!
              </p>

              <div style="background: linear-gradient(135deg, rgba(39, 210, 169, 0.1) 0%, rgba(88, 200, 231, 0.1) 100%); border-radius: 8px; padding: 25px; margin: 20px 0; border-left: 4px solid #27D2A9;">
                <p style="margin: 0 0 15px 0; color: #092358; font-size: 16px; line-height: 1.6;">
                  <strong>You've been checked in successfully!</strong>
                </p>
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  Get ready for an inspiring day of insights, networking, and exploring opportunities in ethical finance across Africa.
                </p>
              </div>

              <h3 style="margin: 30px 0 15px 0; color: #092358; font-size: 20px; font-family: Georgia, serif;">Event Highlights</h3>
              <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 15px; line-height: 1.8;">
                <li>Keynote presentations from industry leaders</li>
                <li>Panel discussions on ethical finance and investment</li>
                <li>Networking opportunities with fellow attendees</li>
                <li>Refreshments and lunch provided</li>
              </ul>

              <div style="background-color: rgba(88, 200, 231, 0.15); border-left: 4px solid #58C8E7; border-radius: 4px; padding: 20px; margin: 30px 0;">
                <h4 style="margin: 0 0 10px 0; color: #092358; font-size: 16px; font-weight: 600;">Make the Most of Your Experience:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.6;">
                  <li>Connect with speakers and attendees during networking sessions</li>
                  <li>Don't hesitate to ask questions during Q&amp;A</li>
                  <li>Share your insights and experiences with the community</li>
                  <li>Follow us on social media for event updates</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0 0; color: #333333; font-size: 15px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to reach out to our event staff or contact us at
                <a href="mailto:events@cfgafrica.com" style="color: #27D2A9; text-decoration: none; font-weight: 600;">events@cfgafrica.com</a>
              </p>

              <p style="margin: 30px 0 0 0; color: #092358; font-size: 16px; font-weight: 600;">
                Enjoy the event!
              </p>`
  );

  const text = `CFG Africa - Welcome to the Event!

Welcome, ${name}! 🎉

Thank you for joining us at the CFG Africa Non-Interest Investment Forum. We're delighted to have you here!

YOU'VE BEEN CHECKED IN SUCCESSFULLY!

Get ready for an inspiring day of insights, networking, and exploring opportunities in ethical finance across Africa.

EVENT HIGHLIGHTS:
- Keynote presentations from industry leaders
- Panel discussions on ethical finance and investment
- Networking opportunities with fellow attendees
- Refreshments and lunch provided

MAKE THE MOST OF YOUR EXPERIENCE:
- Connect with speakers and attendees during networking sessions
- Don't hesitate to ask questions during Q&A
- Share your insights and experiences with the community
- Follow us on social media for event updates

If you have any questions or need assistance, please don't hesitate to reach out to our event staff or contact us at events@cfgafrica.com

Enjoy the event!

© 2026 CFG Africa. All rights reserved.
Visit us at https://cfgafrica.com`;

  return deliver({
    to: guest.email,
    name,
    subject: "Welcome to CFG Africa Event! 🎉",
    htmlbody: html,
    textbody: text,
  });
}
