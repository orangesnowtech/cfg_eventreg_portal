import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";

/**
 * Unified guest list for the admin dashboard: the legacy `guests` collection plus
 * every event's real (non-test) `registrations`, normalised to one shape and tagged
 * with the event they belong to so the dashboard can filter by event.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [guestsSnap, regsSnap, eventsSnap] = await Promise.all([
      adminDb.collection("guests").orderBy("registeredAt", "desc").get(),
      adminDb.collection("registrations").orderBy("registeredAt", "desc").get(),
      adminDb.collection("events").get(),
    ]);

    const eventNames = new Map(eventsSnap.docs.map((doc) => [doc.id, doc.data().name as string]));

    const iso = (value: unknown) => {
      const maybe = value as { toDate?: () => Date } | string | null | undefined;
      if (maybe && typeof maybe === "object" && typeof maybe.toDate === "function") {
        return maybe.toDate().toISOString();
      }
      return (maybe as string) || null;
    };

    const legacy = guestsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        source: "legacy" as const,
        eventId: "legacy",
        eventName: "CFG 2026 (legacy)",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phone: data.phone || "",
        organizationName: data.organizationName || "",
        jobTitle: data.jobTitle || "",
        guestType: data.guestType || "",
        accessCode: data.accessCode || "",
        checkedIn: Boolean(data.checkedIn),
        registeredAt: iso(data.registeredAt),
        checkedInAt: iso(data.checkedInAt),
      };
    });

    const registrations = regsSnap.docs
      .filter((doc) => !doc.data().isTest)
      .map((doc) => {
        const data = doc.data();
        const form = (data.form || {}) as Record<string, unknown>;
        const str = (value: unknown) => (typeof value === "string" ? value : "");
        return {
          id: doc.id,
          source: "event" as const,
          eventId: data.eventId as string,
          eventName: eventNames.get(data.eventId) || "Unknown event",
          firstName: str(form.firstName) || str(data.name),
          lastName: str(form.lastName),
          email: data.email || str(form.email) || "",
          phone: str(form.phone),
          organizationName: str(form.organizationName) || str(form.organization),
          jobTitle: str(form.jobTitle),
          guestType: "",
          accessCode: data.accessCode || "",
          checkedIn: Boolean(data.checkedIn),
          registeredAt: iso(data.registeredAt),
          checkedInAt: iso(data.checkedInAt),
        };
      });

    const guests = [...legacy, ...registrations].sort((a, b) =>
      String(b.registeredAt || "").localeCompare(String(a.registeredAt || ""))
    );

    return NextResponse.json({ guests });
  } catch (error) {
    return authError(error);
  }
}
