import Link from "next/link";
import type { EventRecord } from "@/types/event";
import "./campus-ambassador.css";

/**
 * Shown in place of a programme's application form once an admin closes it.
 * Reuses the programme stylesheet so a closed intake still looks like the page
 * the applicant was linked to, rather than a 404.
 *
 * Deliberately renders no form: the apply route rejects a closed programme, so
 * offering fields here would only produce an error at the end.
 */
export default function ProgrammeClosed({ programme }: { programme: EventRecord }) {
  return (
    <div className="ca">
      <div className="shell">
        <aside className="rail">
          <div className="mark">
            <span />
            CFG Africa
          </div>
          <h1>{programme.name}</h1>
          {programme.description && <p className="lede">{programme.description}</p>}

          <ul className="facts">
            <li>
              <span className="k">Status</span>
              <span className="v">Applications closed</span>
            </li>
          </ul>

          <p className="foot">Private &amp; Confidential · CFG Africa</p>
        </aside>

        <main className="panel">
          <div className="receipt">
            <span className="stamp closed">Applications closed</span>
            <h2>Applications for this programme have closed.</h2>
            <p className="note">
              Thank you for your interest. This intake is no longer accepting applications.
            </p>
            <p className="note">
              If you already applied, your application still stands — shortlisted applicants are contacted on the
              phone number and email address they provided. Watch out for the next cycle.
            </p>

            <div className="actions">
              <Link href="/" className="btn ghost">
                Back to CFG Africa
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
