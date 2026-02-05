import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin';
import { registrationSchema } from '@/lib/validations/registration';
import { generateAccessCode } from '@/types/guest';
import type { Guest, GuestFormData } from '@/types/guest';

export async function POST(request: NextRequest) {
  try {
    console.log('Registration API called');
    const body = await request.json();
    console.log('Request body parsed successfully');

    // Validate input
    const validationResult = registrationSchema.safeParse(body);
    console.log('Validation result:', validationResult.success ? 'passed' : 'failed');
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.issues);
      return NextResponse.json(
        { error: 'Invalid form data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const formData: GuestFormData = validationResult.data;

    console.log('Checking for existing guest...');
    // Check if email already registered
    const existingGuest = await adminDb
      .collection('guests')
      .where('email', '==', formData.email.toLowerCase())
      .limit(1)
      .get();
    console.log('Existing guest check complete, found:', !existingGuest.empty);

    if (!existingGuest.empty) {
      return NextResponse.json(
        { error: 'This email is already registered for the event.' },
        { status: 409 }
      );
    }

    // Generate unique access code
    let accessCode = generateAccessCode();
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      const codeCheck = await adminDb
        .collection('guests')
        .where('accessCode', '==', accessCode)
        .limit(1)
        .get();

      if (codeCheck.empty) {
        isUnique = true;
      } else {
        accessCode = generateAccessCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Unable to generate unique access code. Please try again.' },
        { status: 500 }
      );
    }

    // Create guest document
    const now = new Date();
    const guestData: Omit<Guest, 'id'> = {
      ...formData,
      email: formData.email.toLowerCase(),
      accessCode,
      checkedIn: false,
      registeredAt: now.toISOString(),
      checkedInAt: null,
    };

    const docRef = await adminDb.collection('guests').add(guestData);

    // Log the registration activity
    await adminDb.collection("activityLogs").add({
      type: "registration",
      performedBy: "System",
      targetGuest: `${formData.firstName} ${formData.lastName} (${formData.email.toLowerCase()})`,
      details: `New registration: ${formData.firstName} ${formData.lastName} - ${formData.organizationName} - Access Code: ${accessCode}`,
      timestamp: now.toISOString(),
    });

    // Send confirmation email
    try {
      console.log('Attempting to send confirmation email...');
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guest: {
            ...guestData,
            id: docRef.id,
          },
        }),
      });
      
      console.log('Email API response status:', emailResponse.status);
      
      if (!emailResponse.ok) {
        const emailError = await emailResponse.json();
        console.error('Email API error response:', emailError);
      } else {
        console.log('Confirmation email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email - exception:', emailError);
      if (emailError instanceof Error) {
        console.error('Email error message:', emailError.message);
        console.error('Email error stack:', emailError.stack);
      }
      // Don't fail the registration if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful',
        accessCode,
        guestId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('===== REGISTRATION ERROR =====');
    console.error('Error type:', error?.constructor?.name);
    console.error('Registration error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('===========================');
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
