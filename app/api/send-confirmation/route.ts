import { NextRequest, NextResponse } from 'next/server';
import type { Guest } from '@/types/guest';
import { formatGuestName } from '@/types/guest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guest } = body as { guest: Guest };

    if (!guest || !guest.email || !guest.accessCode) {
      return NextResponse.json(
        { error: 'Guest data is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZEPTOMAIL_API_KEY;
    const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@cfgafrica.com';
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'CFG Africa Events';

    if (!apiKey) {
      console.error('Zeptomail API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Zeptomail API endpoint
    const zeptomailUrl = 'https://api.zeptomail.com/v1.1/email';

    // Email HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Registration Confirmation</title>
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
              <p style="margin: 10px 0 0 0; color: #E0FAF4; font-size: 16px; font-weight: 500;">Event Registration Confirmation</p>
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
              <h2 style="margin: 0 0 20px 0; color: #092358; font-size: 24px; font-family: Georgia, serif;">Welcome, ${formatGuestName(guest)}!</h2>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for registering for our upcoming event. We're excited to have you join us!
              </p>

              <!-- Event Details -->
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

              <!-- Access Code Box -->
              <div style="background: linear-gradient(135deg, rgba(39, 210, 169, 0.1) 0%, rgba(88, 200, 231, 0.1) 100%); border: 2px solid #27D2A9; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #092358; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Access Code</p>
                <p style="margin: 0; color: #092358; font-size: 36px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 6px;">
                  ${guest.accessCode}
                </p>
                <p style="margin: 15px 0 0 0; color: #333333; font-size: 14px;">
                  Please keep this code safe. You'll need it to check in at the event.
                </p>
              </div>

              <!-- Registration Details -->
              <h3 style="margin: 30px 0 15px 0; color: #092358; font-size: 18px; font-family: Georgia, serif;">Registration Details</h3>
              
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #092358; font-size: 14px; font-weight: 600; border-bottom: 1px solid #E0FAF4;">Name:</td>
                  <td style="padding: 8px 0; color: #333333; font-size: 14px; border-bottom: 1px solid #E0FAF4;">${formatGuestName(guest)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #092358; font-size: 14px; font-weight: 600; border-bottom: 1px solid #E0FAF4;">Email:</td>
                  <td style="padding: 8px 0; color: #333333; font-size: 14px; border-bottom: 1px solid #E0FAF4;">${guest.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #092358; font-size: 14px; font-weight: 600; border-bottom: 1px solid #E0FAF4;">Organization:</td>
                  <td style="padding: 8px 0; color: #333333; font-size: 14px; border-bottom: 1px solid #E0FAF4;">${guest.organizationName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #092358; font-size: 14px; font-weight: 600; border-bottom: 1px solid #E0FAF4;">Guest Type:</td>
                  <td style="padding: 8px 0; color: #333333; font-size: 14px; border-bottom: 1px solid #E0FAF4;">${guest.guestType}</td>
                </tr>
              </table>

              <!-- Important Information -->
              <div style="background-color: rgba(88, 200, 231, 0.15); border-left: 4px solid #58C8E7; border-radius: 4px; padding: 15px; margin: 30px 0;">
                <p style="margin: 0; color: #092358; font-size: 14px; line-height: 1.6;">
                  <strong>Important:</strong> Please arrive 15 minutes early for check-in. Bring this email or have your access code ready.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; color: #333333; font-size: 14px; line-height: 1.6;">
                If you have any questions, please contact us at <a href="mailto:events@cfgafrica.com" style="color: #27D2A9; text-decoration: none; font-weight: 600;">events@cfgafrica.com</a>
              </p>
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
</html>
    `;

    // Plain text version
    const textContent = `
CFG Africa Event Registration Confirmation

Welcome, ${formatGuestName(guest)}!

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
- Name: ${formatGuestName(guest)}
- Email: ${guest.email}
- Organization: ${guest.organizationName}
- Guest Type: ${guest.guestType}

IMPORTANT: Please arrive 15 minutes early for check-in. Bring this email or have your access code ready.

If you have any questions, please contact us at events@cfgafrica.com

© 2026 CFG Africa. All rights reserved.
Visit us at https://cfgafrica.com
    `;

    // Send email via Zeptomail
    const response = await fetch(zeptomailUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        from: {
          address: fromEmail,
          name: fromName,
        },
        to: [
          {
            email_address: {
              address: guest.email,
              name: formatGuestName(guest),
            },
          },
        ],
        subject: 'CFG Event Registration Confirmation',
        htmlbody: htmlContent,
        textbody: textContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Zeptomail error:', errorData);
      throw new Error('Failed to send email');
    }

    return NextResponse.json(
      { success: true, message: 'Confirmation email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
}
