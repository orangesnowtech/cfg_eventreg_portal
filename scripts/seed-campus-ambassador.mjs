/**
 * Create or refresh the Campus Ambassador programme record in Firestore.
 *
 * Programmes live in the `events` collection with kind:"programme". The form
 * itself is hardcoded in the app; the field definitions written here exist so the
 * admin dashboard and CSV export can label the answers. Both this script and the
 * app read lib/programmes/campus-ambassador.record.json, so re-running after a
 * label or choice change is what keeps the dashboard in step with the form.
 *
 * Safe to re-run: it updates the existing record rather than adding a second one,
 * and never touches `status`, so a live programme is not taken down by a reseed.
 * New records are created as "draft" — publish them from the admin dashboard.
 *
 *   node scripts/seed-campus-ambassador.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");

function loadEnv(file = join(projectRoot, ".env.local")) {
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

function initAdmin() {
  if (getApps().length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, or all of\n" +
        "FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, in .env.local."
    );
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const record = JSON.parse(
  readFileSync(join(projectRoot, "lib", "programmes", "campus-ambassador.record.json"), "utf8")
);

initAdmin();
const db = getFirestore();

const existing = await db.collection("events").where("slug", "==", record.slug).limit(1).get();
const now = new Date().toISOString();

const payload = {
  kind: "programme",
  name: record.name,
  slug: record.slug,
  description: record.description,
  // "CFG Africa Events" is the wrong sender for an application, so programmes name their own.
  emailFromName: record.emailFromName || "",
  form: record.form,
  // A programme has nowhere to attend and nothing to count down to.
  venue: "",
  startAt: null,
  endAt: null,
  remindersEnabled: false,
  featured: false,
  updatedAt: now,
};

if (existing.empty) {
  const ref = await db.collection("events").add({ ...payload, status: "draft", createdAt: now });
  console.log(`Created programme "${record.name}"`);
  console.log(`  id:   ${ref.id}`);
  console.log(`  slug: ${record.slug}`);
  console.log(`\nIt is a draft. Set it to testing or published in the admin dashboard, then open:`);
  console.log(`  /programmes/${record.slug}`);
} else {
  const doc = existing.docs[0];
  if (doc.data().kind !== "programme") {
    console.error(`An event already uses the slug "${record.slug}". Rename it, or change the slug in the JSON.`);
    process.exit(1);
  }
  // status is deliberately absent from payload, so a published programme stays up.
  await doc.ref.update(payload);
  console.log(`Updated programme "${record.name}" (${doc.id}); status left as "${doc.data().status}".`);
}

process.exit(0);
