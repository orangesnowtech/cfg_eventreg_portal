import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";
import type { AdminRole } from "@/types/guest";

const ROLES: AdminRole[] = ["admin", "super_admin"];
// Firebase Auth's own minimum, and what the create form already enforces.
const MIN_PASSWORD = 6;

/**
 * Edit another admin's name, email, role or password. Super admins only.
 *
 * A super admin cannot change their own role: as long as the caller stays a
 * super admin there is always at least one, so nobody can lock the team out.
 * A new password set for someone else signs them out of every session, so a
 * reset after a leaked password actually takes effect.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try {
    actor = await requireAdmin(request, ["super_admin"]);
  } catch (error) {
    return authError(error);
  }

  try {
    const { id } = await params;
    const ref = adminDb.collection("admins").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
    const current = doc.data()!;

    const body = await request.json();
    const isSelf = id === actor.uid;

    const authUpdate: { displayName?: string; email?: string; password?: string } = {};
    const docUpdate: Record<string, unknown> = {};
    const changed: string[] = [];

    if (body.displayName !== undefined) {
      const displayName = String(body.displayName).trim().slice(0, 120);
      if (!displayName) return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
      if (displayName !== current.displayName) {
        authUpdate.displayName = displayName;
        docUpdate.displayName = displayName;
        changed.push("name");
      }
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      if (email !== String(current.email || "").toLowerCase()) {
        authUpdate.email = email;
        docUpdate.email = email;
        changed.push("email");
      }
    }

    if (body.role !== undefined && body.role !== current.role) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Role must be Admin or Super Admin." }, { status: 400 });
      }
      if (isSelf) {
        return NextResponse.json({ error: "You cannot change your own role. Ask another super admin." }, { status: 400 });
      }
      docUpdate.role = body.role;
      changed.push("role");
    }

    if (body.password !== undefined && body.password !== "") {
      const password = String(body.password);
      if (password.length < MIN_PASSWORD) {
        return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, { status: 400 });
      }
      authUpdate.password = password;
      changed.push("password");
    }

    if (!changed.length) return NextResponse.json({ success: true, unchanged: true });

    if (Object.keys(authUpdate).length) await adminAuth.updateUser(id, authUpdate);
    // Ends the person's existing sessions. Skipped for your own account, which
    // would otherwise sign you out mid-edit.
    if (authUpdate.password && !isSelf) await adminAuth.revokeRefreshTokens(id);

    const now = new Date().toISOString();
    if (Object.keys(docUpdate).length) await ref.update({ ...docUpdate, updatedAt: now, updatedBy: actor.email });

    // Records what changed, never the password itself.
    await adminDb.collection("activityLogs").add({
      type: "admin_updated",
      performedBy: actor.email,
      targetAdmin: docUpdate.email || current.email,
      details: `Updated ${changed.join(", ")} for ${current.displayName || current.email}${
        docUpdate.role ? ` (now ${docUpdate.role === "super_admin" ? "Super Admin" : "Admin"})` : ""
      }`,
      timestamp: now,
    });

    return NextResponse.json({ success: true, changed });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Another account already uses that email." }, { status: 409 });
    }
    if (code === "auth/invalid-password") {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, { status: 400 });
    }
    console.error("Error updating admin user:", error);
    return NextResponse.json({ error: "Could not update this admin user." }, { status: 500 });
  }
}
