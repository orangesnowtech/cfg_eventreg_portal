import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export async function GET() {
  try {
    const guestsSnapshot = await adminDb
      .collection("guests")
      .orderBy("registeredAt", "desc")
      .get();

    const guests = guestsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Handle both Firestore Timestamp and ISO string formats
        registeredAt: data.registeredAt?.toDate?.()?.toISOString() || data.registeredAt || null,
        checkedInAt: data.checkedInAt?.toDate?.()?.toISOString() || data.checkedInAt || null,
      };
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json(
      { error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}
