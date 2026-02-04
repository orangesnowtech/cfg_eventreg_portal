import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/admin";
import type { AdminUser } from "@/types/guest";

// GET - List all admin users
export async function GET(request: NextRequest) {
  try {
    // Get current user from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get admin document to check role
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
        { error: "Only super admins can view users" },
        { status: 403 }
      );
    }

    // Fetch all admin users
    const adminsSnapshot = await adminDb
      .collection("admins")
      .orderBy("createdAt", "desc")
      .get();

    const admins = adminsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        lastLoginAt: data.lastLoginAt || null,
      };
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin users" },
      { status: 500 }
    );
  }
}

// POST - Create new admin user
export async function POST(request: NextRequest) {
  try {
    // Get current user from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get admin document to check role
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
        { error: "Only super admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, displayName, password, role } = body;

    if (!email || !displayName || !password || !role) {
      return NextResponse.json(
        { error: "Email, display name, password, and role are required" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'super_admin'" },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // Create admin document in Firestore
    const now = new Date().toISOString();
    const adminUser: Omit<AdminUser, "id"> = {
      email,
      displayName,
      role,
      createdAt: now,
      createdBy: decodedToken.email || "unknown",
      lastLoginAt: null,
    };

    await adminDb.collection("admins").doc(userRecord.uid).set(adminUser);

    // Log the activity
    await adminDb.collection("activityLogs").add({
      type: "admin_created",
      performedBy: decodedToken.email,
      targetAdmin: email,
      details: `Created ${role} user: ${displayName} (${email})`,
      timestamp: now,
    });

    return NextResponse.json(
      {
        success: true,
        admin: {
          id: userRecord.uid,
          ...adminUser,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating admin user:", error);
    
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
