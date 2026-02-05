import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/admin';
import type { Guest } from '@/types/guest';

interface GuestWithId extends Guest {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestId } = body;

    // Get current user from Authorization header (optional for check-in)
    const authHeader = request.headers.get("authorization");
    let checkedInBy = "Staff"; // Default if no auth

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const decodedToken = await adminAuth.verifyIdToken(token);
        checkedInBy = decodedToken.email || "Staff";
      } catch (error) {
        // If token verification fails, use default "Staff"
        console.log("Token verification failed, using default Staff");
      }
    }

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      );
    }

    // Get guest document
    const guestRef = adminDb.collection('guests').doc(guestId);
    const guestDoc = await guestRef.get();

    if (!guestDoc.exists) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    const guestData = guestDoc.data() as Guest;

    // Check if already checked in
    if (guestData.checkedIn) {
      return NextResponse.json(
        {
          error: 'Guest has already been checked in',
          guest: {
            id: guestDoc.id,
            ...guestData,
          },
        },
        { status: 409 }
      );
    }

    // Update check-in status
    const now = new Date();
    await guestRef.update({
      checkedIn: true,
      checkedInAt: now.toISOString(),
      checkedInBy,
    });

    // Log the check-in activity
    await adminDb.collection("activityLogs").add({
      type: "check_in",
      performedBy: checkedInBy,
      targetGuest: `${guestData.firstName} ${guestData.lastName} (${guestData.email})`,
      details: `Checked in ${guestData.firstName} ${guestData.lastName} - Access Code: ${guestData.accessCode}`,
      timestamp: now.toISOString(),
    });

    // Send welcome email
    try {
      console.log('Attempting to send welcome email...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const emailUrl = new URL('/api/send-welcome', baseUrl).toString();
      console.log('Welcome email API URL:', emailUrl);
      
      const emailResponse = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guest: {
            ...guestData,
            id: guestDoc.id,
            checkedIn: true,
            checkedInAt: now.toISOString(),
          },
        }),
      });
      
      console.log('Welcome email API response status:', emailResponse.status);
      
      if (!emailResponse.ok) {
        const emailError = await emailResponse.json();
        console.error('Welcome email API error response:', emailError);
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send welcome email - exception:', emailError);
      if (emailError instanceof Error) {
        console.error('Email error message:', emailError.message);
      }
      // Don't fail the check-in if email fails
    }

    // Return updated guest data
    const updatedGuest: GuestWithId = {
      id: guestDoc.id,
      ...guestData,
      checkedIn: true,
      checkedInAt: now.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Check-in successful',
        guest: updatedGuest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'An error occurred during check-in. Please try again.' },
      { status: 500 }
    );
  }
}
