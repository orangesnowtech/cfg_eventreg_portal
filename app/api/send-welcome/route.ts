import { NextRequest, NextResponse } from 'next/server';
import type { Guest } from '@/types/guest';
import { formatGuestName } from '@/types/guest';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Send Welcome Email API Called ===');
    const body = await request.json();
    const { guest } = body as { guest: Guest };

    if (!guest || !guest.email) {
      console.error('Invalid guest data:', { hasGuest: !!guest, hasEmail: !!guest?.email });
      return NextResponse.json(
        { error: 'Guest data is required' },
        { status: 400 }
      );
    }

    console.log('Sending welcome email to:', guest.email);

    const apiKey = process.env.ZEPTOMAIL_API_KEY;
    const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@cfgafrica.com';
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'CFG Africa Events';

    console.log('Email configuration:', {
      hasApiKey: !!apiKey,
      fromEmail,
      fromName,
    });

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
  <title>Welcome to CFG Africa Event</title>
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
              <p style="margin: 10px 0 0 0; color: #E0FAF4; font-size: 16px; font-weight: 500;">Welcome to the Event!</p>
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
              <h2 style="margin: 0 0 20px 0; color: #092358; font-size: 28px; font-family: Georgia, serif;">Welcome, ${formatGuestName(guest)}! 🎉</h2>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for joining us at the <strong>CFG Africa Non-Interest Investment Forum</strong>. We're delighted to have you here!
              </p>

              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, rgba(39, 210, 169, 0.1) 0%, rgba(88, 200, 231, 0.1) 100%); border-radius: 8px; padding: 25px; margin: 20px 0; border-left: 4px solid #27D2A9;">
                <p style="margin: 0 0 15px 0; color: #092358; font-size: 16px; line-height: 1.6;">
                  <strong>You've been checked in successfully!</strong>
                </p>
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  Get ready for an inspiring day of insights, networking, and exploring opportunities in ethical finance across Africa.
                </p>
              </div>

              <!-- Event Details -->
              <h3 style="margin: 30px 0 15px 0; color: #092358; font-size: 20px; font-family: Georgia, serif;">Event Highlights</h3>
              <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 15px; line-height: 1.8;">
                <li>Keynote presentations from industry leaders</li>
                <li>Panel discussions on ethical finance and investment</li>
                <li>Networking opportunities with fellow attendees</li>
                <li>Refreshments and lunch provided</li>
              </ul>

              <!-- Tips Box -->
              <div style="background-color: rgba(88, 200, 231, 0.15); border-left: 4px solid #58C8E7; border-radius: 4px; padding: 20px; margin: 30px 0;">
                <h4 style="margin: 0 0 10px 0; color: #092358; font-size: 16px; font-weight: 600;">Make the Most of Your Experience:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.6;">
                  <li>Connect with speakers and attendees during networking sessions</li>
                  <li>Don't hesitate to ask questions during Q&A</li>
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
CFG Africa - Welcome to the Event!

Welcome, ${formatGuestName(guest)}! 🎉

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
Visit us at https://cfgafrica.com
    `;

    // Send email via Zeptomail
    console.log('Calling Zeptomail API...');
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
        subject: 'Welcome to CFG Africa Event! 🎉',
        htmlbody: htmlContent,
        textbody: textContent,
      }),
    });

    console.log('Zeptomail response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Zeptomail error response:', errorData);
      throw new Error('Failed to send email');
    }

    const responseData = await response.json();
    console.log('Welcome email sent successfully:', responseData);

    return NextResponse.json(
      { success: true, message: 'Welcome email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== Welcome Email Sending Error ===');
    console.error('Email sending error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('===========================');
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}
