import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Events in testing are reachable by direct link so the form can be trialled.
  const snapshot = await adminDb.collection("events").where("slug", "==", slug).where("status", "in", ["published", "testing"]).limit(1).get();
  if (snapshot.empty) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const doc = snapshot.docs[0];
  // Programmes live in this collection too, but they are not events and are served
  // by /programmes/[slug]; returning one here would hand the generic event UI a form
  // it cannot render correctly and cannot validate.
  if (doc.data().kind === "programme") return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ event: { id: doc.id, ...doc.data() } });
}