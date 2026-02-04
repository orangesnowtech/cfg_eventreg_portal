import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get admin document
    const adminDoc = await adminDb
      .collection("admins")
      .doc(decodedToken.uid)
      .get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    const adminData = adminDoc.data();

    // Update last login
    await adminDb.collection("admins").doc(decodedToken.uid).update({
      lastLoginAt: new Date().toISOString(),
    });

    // Log admin login
    await adminDb.collection("activityLogs").add({
      type: "admin_login",
      performedBy: decodedToken.email,
      details: `Admin logged in: ${adminData?.displayName || decodedToken.email}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      role: adminData?.role || "admin",
      email: adminData?.email,
      displayName: adminData?.displayName,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
