import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";
import CampusAmbassadorForm from "@/components/CampusAmbassadorForm";
import ProgrammeClosed from "@/components/ProgrammeClosed";
import { adminDb } from "@/lib/admin";
import { CAMPUS_AMBASSADOR_SLUG } from "@/lib/programmes/campus-ambassador";
import type { EventRecord } from "@/types/event";

export const dynamic = "force-dynamic";

/*
 * Programme pages set their own type rather than inheriting the portal's
 * Montserrat. The variables are consumed by components/campus-ambassador.css.
 */
// Public Sans and Newsreader are variable fonts, so no weight is requested: the
// full axis is served and the stylesheet's 300–600 weights all resolve. IBM Plex
// Mono ships as static instances and has to name the ones it uses.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--ca-sans" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--ca-serif" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ca-mono" });

/**
 * Programmes live in the `events` collection alongside events, told apart by
 * `kind`. Fetched by slug alone — a single-field query needs no composite index —
 * then filtered in code. Programmes in testing are reachable by direct link, the
 * same way events in testing are.
 *
 * Closed programmes are served as well, so that an application link already out
 * in the world explains that the intake has ended instead of 404ing. Drafts stay
 * hidden: nothing has been shared for them yet.
 */
async function getProgramme(slug: string): Promise<EventRecord | null> {
  const snapshot = await adminDb.collection("events").where("slug", "==", slug).limit(1).get();
  const doc = snapshot.docs[0];
  if (!doc) return null;

  const data = doc.data();
  if (data.kind !== "programme") return null;
  if (!["published", "testing", "closed"].includes(data.status)) return null;

  return { id: doc.id, ...data } as EventRecord;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const programme = await getProgramme((await params).slug);
  if (!programme) return { title: "Programme not found — CFG Africa" };
  if (programme.status === "closed") {
    return {
      title: `${programme.name} — applications closed — CFG Africa`,
      description: "This intake is no longer accepting applications.",
    };
  }
  return {
    title: `${programme.name} — CFG Africa`,
    description: programme.description || "Apply to the CFG Africa Campus Ambassador Programme.",
  };
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const programme = await getProgramme(slug);
  // Each programme form is hardcoded, so an unrecognised slug has nothing to render.
  if (!programme || slug !== CAMPUS_AMBASSADOR_SLUG) notFound();

  return (
    <div className={`${publicSans.variable} ${newsreader.variable} ${plexMono.variable}`}>
      {programme.status === "closed" ? (
        <ProgrammeClosed programme={programme} />
      ) : (
        <CampusAmbassadorForm programme={programme} />
      )}
    </div>
  );
}
