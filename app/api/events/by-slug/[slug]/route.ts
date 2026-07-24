import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Events in testing are reachable by direct link so the form can be trialled.
  const snapshot = await adminDb.collection("events").where("slug", "==", slug).where("status", "in", ["published", "testing"]).limit(1).get();
  if (snapshot.empty) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const doc = snapshot.docs[0];
  return NextResponse.json({ event: { id: doc.id, ...doc.data() } });
}