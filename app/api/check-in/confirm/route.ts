import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin';
import { requireAdmin, authError } from '@/lib/server-auth';
import { sendGuestWelcomeEmail } from '@/lib/legacy-email';
import type { Guest } from '@/types/guest';

interface GuestWithId extends Guest {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    // Checking a guest in is a staff action and is attributed in the activity
    // log, so the caller must be a known admin. This previously fell through to
    // an anonymous "Staff" attribution, which let anyone check in any guest ID.
    const actor = await requireAdmin(request);
    const checkedInBy = actor.email;

    const body = await request.json();
    const { guestId } = body;

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

    // Send welcome email. Called directly rather than over an internal HTTP hop,
    // so there is no publicly reachable send endpoint and no dependency on
    // NEXT_PUBLIC_APP_URL being set correctly. A failed send must not fail a
    // check-in that has already been written, so the result is only logged.
    const emailResult = await sendGuestWelcomeEmail({
      ...guestData,
      checkedIn: true,
      checkedInAt: now.toISOString(),
    });
    if (!emailResult.sent) {
      console.error('Welcome email not sent:', emailResult.reason);
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
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return authError(error);
    }
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'An error occurred during check-in. Please try again.' },
      { status: 500 }
    );
  }
}
