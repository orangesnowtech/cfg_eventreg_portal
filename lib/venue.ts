/**
 * True when the venue is a Google Maps link rather than a written address.
 * Covers full links (google.com/maps, maps.google.com) and the short share
 * links the Maps app produces (maps.app.goo.gl, goo.gl/maps).
 */
export function isMapsLink(venue: string | undefined | null): boolean {
  if (!venue) return false;
  let url: URL;
  try {
    url = new URL(venue.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const host = url.hostname.replace(/^www\./, "");
  if (host === "maps.app.goo.gl") return true;
  if (host === "goo.gl") return url.pathname.startsWith("/maps");
  if (/^maps\.google\.[a-z.]+$/.test(host)) return true;
  return /^google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps");
}
