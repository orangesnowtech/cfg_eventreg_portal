import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(request); const { id } = await params; const snapshot = await adminDb.collection("registrations").where("eventId", "==", id).orderBy("registeredAt", "desc").limit(1000).get(); return NextResponse.json({ registrations: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }); }
  catch (error) { return authError(error); }
}