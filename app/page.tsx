import Link from "next/link";
import Image from "next/image";
import EventCountdown from "@/components/EventCountdown";
import { getFeaturedEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const highlight = await getFeaturedEvent();
  const featured = highlight?.event;
  const phase = highlight?.phase;
  const open = highlight?.open ?? false;

  return (
    <div className="min-h-screen bg-cfg-mint dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-cfg-secondary bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center text-center gap-3">
            <Image
              src="/cfg-logo.png"
              alt="CFG Africa"
              width={150}
              height={150}
              className="object-contain"
            />
          </div>
          <Link
            href="/events"
            className="text-sm font-semibold text-cfg-primary hover:underline dark:text-blue-300"
          >
            All events
          </Link>
        </div>
        {/* Signature Line */}
        <div className="cfg-signature-line"></div>
      </header>

      {/* Featured Event */}
      <div className="container mx-auto px-4 py-12">
        {featured ? (
          <div className="mx-auto max-w-3xl">
            {featured.bannerUrl && (
              <div className="relative mb-6 aspect-3/1 w-full overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={featured.bannerUrl}
                  alt={`${featured.name} banner`}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                  priority
                />
              </div>
            )}
            <div className="rounded-2xl bg-cfg-primary p-8 text-center text-white shadow-xl md:p-12">
              <p className="text-sm font-semibold uppercase tracking-widest text-cfg-secondary">
                {phase === "present" ? "Happening now" : "Featured event"}
              </p>
              <h2
                className="mt-3 text-4xl font-bold"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {featured.name}
              </h2>

              {featured.description && (
                <p className="mx-auto mt-4 max-w-xl text-white/80">
                  {featured.description}
                </p>
              )}

              <div className="mt-4 text-sm text-white/70">
                {featured.venue && <span>{featured.venue}</span>}
                {featured.startAt && (
                  <span className="ml-3">
                    {new Date(featured.startAt).toLocaleString()}
                  </span>
                )}
              </div>

              {phase === "upcoming" && featured.startAt && (
                <div className="mt-8">
                  <EventCountdown startAt={featured.startAt} size="large" />
                </div>
              )}

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                {open ? (
                  <Link
                    href={`/events/${featured.slug}`}
                    className="rounded-lg bg-cfg-secondary px-7 py-3 font-bold text-cfg-primary transition-opacity hover:opacity-90"
                  >
                    Register now
                  </Link>
                ) : (
                  <span className="rounded-lg bg-white/10 px-7 py-3 font-semibold text-white/70">
                    Registration closed
                  </span>
                )}
                <Link
                  href="/events"
                  className="rounded-lg border border-white/40 px-7 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See all events
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="mb-4 text-4xl font-bold text-cfg-primary dark:text-blue-300"
              style={{ fontFamily: "Georgia, serif" }}
            >
              No events open right now
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Check back soon — new CFG Africa events are announced here.
            </p>
            <Link
              href="/events"
              className="mt-8 inline-block rounded-lg bg-cfg-primary px-7 py-3 font-semibold text-white"
            >
              See all events
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2026 CFG Africa. All rights reserved.</p>
          <p className="mt-2">
            Questions? Contact us at{" "}
            <a href="mailto:events@cfgafrica.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              events@cfgafrica.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
