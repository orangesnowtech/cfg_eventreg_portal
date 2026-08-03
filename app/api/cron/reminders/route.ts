import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReminderSweep } from "@/lib/reminders";

// Every run must read live data and is allowed to take a while: a sweep may mail
// a large registrant list in paced batches.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Constant-time comparison so the secret cannot be guessed byte by byte. */
function matchesSecret(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * The scheduler proves itself with the shared secret, sent either as
 * `Authorization: Bearer <secret>` or `X-Cron-Secret: <secret>`. Nothing here is
 * reachable without it: an open endpoint would let anyone mail every registrant.
 */
function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : request.headers.get("x-cron-secret") || "";
  return Boolean(provided) && matchesSecret(provided, expected);
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error("Reminder sweep rejected: CRON_SECRET is not set in this environment");
    return NextResponse.json({ error: "Reminders are not configured." }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminderSweep();
    if (result.dispatched.length) {
      console.log("Reminder sweep sent:", JSON.stringify(result.dispatched));
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    // A 500 tells Cloud Scheduler to retry, which is safe: milestones already sent
    // are claimed in Firestore and will not be mailed twice.
    console.error("Reminder sweep failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reminder sweep failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
