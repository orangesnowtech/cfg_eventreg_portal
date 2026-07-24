import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/admin";
import type { AdminRole } from "@/types/guest";

export async function requireAdmin(request: NextRequest, roles?: AdminRole[]) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = await adminAuth.verifyIdToken(header.slice(7));
  const snapshot = await adminDb.collection("admins").doc(token.uid).get();
  if (!snapshot.exists) throw new Error("Forbidden");

  const role = snapshot.data()?.role as AdminRole;
  if (roles?.length && !roles.includes(role)) throw new Error("Forbidden");
  return { uid: token.uid, email: token.email || "admin", role };
}

export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";
  return new Response(JSON.stringify({ error: message }), {
    status: message === "Forbidden" ? 403 : 401,
    headers: { "Content-Type": "application/json" },
  });
}
