"use client";

import { useEffect, useState } from "react";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parts(remaining: number) {
  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / 1000),
  };
}

export default function EventCountdown({
  startAt,
  size = "normal",
}: {
  startAt: string;
  size?: "normal" | "large";
}) {
  // Rendered only after mount: the server and the visitor's clock disagree, so
  // counting down during SSR would produce a hydration mismatch.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(startAt).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startAt]);

  const large = size === "large";
  const box = large
    ? "min-w-20 rounded-xl bg-white/10 px-3 py-3"
    : "min-w-14 rounded-lg bg-gray-100 px-2 py-2";
  const number = large
    ? "text-3xl font-bold tabular-nums md:text-4xl"
    : "text-xl font-bold tabular-nums";
  const caption = large
    ? "text-[11px] uppercase tracking-widest opacity-70"
    : "text-[10px] uppercase tracking-wider text-gray-500";

  if (remaining === null) {
    return (
      <div className={`flex gap-2 ${large ? "justify-center" : ""}`} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${box} text-center`}>
            <div className={number}>--</div>
            <div className={caption}>&nbsp;</div>
          </div>
        ))}
      </div>
    );
  }

  if (remaining === 0) {
    return (
      <p className={large ? "text-lg font-semibold" : "text-sm font-semibold text-cfg-primary"}>
        Happening now
      </p>
    );
  }

  const { days, hours, minutes, seconds } = parts(remaining);
  const units = [
    { value: days, label: days === 1 ? "day" : "days" },
    { value: hours, label: "hrs" },
    { value: minutes, label: "min" },
    { value: seconds, label: "sec" },
  ];

  return (
    <div
      className={`flex gap-2 ${large ? "justify-center" : ""}`}
      role="timer"
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes until this event starts`}
    >
      {units.map((unit) => (
        <div key={unit.label} className={`${box} text-center`}>
          <div className={number}>{String(unit.value).padStart(2, "0")}</div>
          <div className={caption}>{unit.label}</div>
        </div>
      ))}
    </div>
  );
}
