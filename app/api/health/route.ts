import { NextResponse } from 'next/server';

export async function GET() {
  // FIREBASE_SERVICE_ACCOUNT_JSON is the credential apphosting.yaml actually
  // wires up, and the one lib/admin.ts prefers. This previously reported only on
  // FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY, which the deploy config
  // does not reference at all — so a healthy deploy looked like it had no
  // credentials, and a real credential outage would have looked identical.
  const envCheck = {
    hasFirebaseServiceAccountJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    hasLegacyFirebaseCredentials: !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ),
    hasZeptomailApiKey: !!process.env.ZEPTOMAIL_API_KEY,
    hasZeptomailFromEmail: !!process.env.ZEPTOMAIL_FROM_EMAIL,
    hasZeptomailFromName: !!process.env.ZEPTOMAIL_FROM_NAME,
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: envCheck,
  });
}
