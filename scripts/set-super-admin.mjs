/**
 * Grant super_admin to an existing Firebase Auth user.
 *
 * The /api/admin/users endpoint can only be called by an existing super_admin,
 * so this script exists to bootstrap the first one (or to promote someone when
 * no super_admin is available to do it through the dashboard).
 *
 *   node scripts/set-super-admin.mjs <uid>
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function loadEnv(file = ".env.local") {
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    return; // fall back to whatever is already in the environment
  }
  // Split on CRLF as well as LF: `.` in JS does not match CR, so a stray \r
  // would stop the value pattern from reaching end-of-line.
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/set-super-admin.mjs <uid>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase admin credentials in .env.local");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();
const auth = getAuth();

const user = await auth.getUser(uid).catch((error) => {
  console.error(`No Firebase Auth user with uid ${uid}: ${error.message}`);
  process.exit(1);
});

const ref = db.collection("admins").doc(uid);
const existing = await ref.get();
const now = new Date().toISOString();

if (existing.exists) {
  await ref.update({ role: "super_admin" });
  console.log(`Promoted existing admin ${user.email || uid} to super_admin.`);
} else {
  await ref.set({
    email: user.email || "",
    displayName: user.displayName || user.email || uid,
    role: "super_admin",
    createdAt: now,
    createdBy: "scripts/set-super-admin.mjs",
    lastLoginAt: null,
  });
  console.log(`Created super_admin record for ${user.email || uid}.`);
}

await db.collection("activityLogs").add({
  type: "admin_role_changed",
  performedBy: "scripts/set-super-admin.mjs",
  targetAdmin: user.email || uid,
  details: `Granted super_admin to ${user.email || uid} (${uid})`,
  timestamp: now,
});

console.log(`Done. Project: ${projectId}`);
process.exit(0);
