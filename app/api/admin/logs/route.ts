import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/admin";
import type { ActivityLog } from "@/types/guest";

export async function GET(request: NextRequest) {
  try {
    // Get current user from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get admin document to check if user is admin
    const adminDoc = await adminDb
      .collection("admins")
      .doc(decodedToken.uid)
      .get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    const adminData = adminDoc.data();
    if (adminData?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can view activity logs" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const type = searchParams.get("type"); // Filter by activity type

    let query = adminDb
      .collection("activityLogs")
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (type) {
      query = query.where("type", "==", type) as any;
    }

    const logsSnapshot = await query.get();

    const logs: ActivityLog[] = logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        performedBy: data.performedBy,
        targetGuest: data.targetGuest,
        targetAdmin: data.targetAdmin,
        details: data.details,
        timestamp: data.timestamp,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
