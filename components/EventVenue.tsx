import { isMapsLink } from "@/lib/venue";

/** The venue as text, or as a "View location" link when it is a Google Maps URL. */
export default function EventVenue({ venue, className = "" }: { venue: string; className?: string }) {
  if (isMapsLink(venue)) {
    return (
      <a
        href={venue.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-semibold underline underline-offset-2 hover:opacity-80 ${className}`}
      >
        View location on Google Maps
      </a>
    );
  }
  return <span className={className}>{venue}</span>;
}
