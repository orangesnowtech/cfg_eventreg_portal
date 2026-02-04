import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
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
