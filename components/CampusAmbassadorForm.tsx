"use client";

import { useMemo, useRef, useState } from "react";
import type { EventRecord } from "@/types/event";
import {
  ABOUT_MAX_WORDS,
  CGPA_OPTIONS,
  COMMITMENT_OPTIONS,
  DISQUALIFYING,
  EXPERIENCE_OPTIONS,
  INSTITUTIONAL_DOMAIN,
  LEVEL_OPTIONS,
  WHY_MAX_WORDS,
  countWords,
} from "@/lib/programmes/campus-ambassador";
import "./campus-ambassador.css";

type Values = {
  name: string;
  phone: string;
  email: string;
  level: string;
  dept: string;
  cgpa: string;
  about: string;
  why: string;
  exp: string[];
  commit: string[];
};

const EMPTY: Values = {
  name: "",
  phone: "",
  email: "",
  level: "",
  dept: "",
  cgpa: "",
  about: "",
  why: "",
  exp: [],
  commit: [],
};

/**
 * Mirrors lib/programmes/campus-ambassador's schema so the progress meter and the
 * inline errors agree with what the server will accept. The server remains the
 * authority — this only decides what the applicant sees before they submit.
 */
const CHECKS: { id: keyof Values; label: string; ok: (v: Values) => boolean }[] = [
  { id: "name", label: "Full name", ok: (v) => v.name.trim().length >= 2 },
  { id: "phone", label: "Phone / WhatsApp", ok: (v) => v.phone.replace(/\D/g, "").length >= 10 },
  {
    id: "email",
    label: "Institutional email",
    ok: (v) => {
      const value = v.email.trim().toLowerCase();
      return value.endsWith(INSTITUTIONAL_DOMAIN) && /^[^@\s]+@/.test(value);
    },
  },
  { id: "level", label: "Level of study", ok: (v) => Boolean(v.level) },
  { id: "dept", label: "Department & college", ok: (v) => v.dept.trim().length >= 2 },
  { id: "cgpa", label: "CGPA", ok: (v) => Boolean(v.cgpa) },
  {
    id: "about",
    label: "About you",
    ok: (v) => countWords(v.about) > 0 && countWords(v.about) <= ABOUT_MAX_WORDS,
  },
  {
    id: "why",
    label: "Why you're applying",
    ok: (v) => countWords(v.why) > 0 && countWords(v.why) <= WHY_MAX_WORDS,
  },
  { id: "exp", label: "Leadership experience", ok: (v) => v.exp.length > 0 },
  { id: "commit", label: "Commitments", ok: (v) => v.commit.length === COMMITMENT_OPTIONS.length },
];

export default function CampusAmbassadorForm({ programme }: { programme: EventRecord }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; emailSent: boolean; values: Values } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isTest = programme.status === "testing";

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setServerError("");
  };

  const toggle = (key: "exp" | "commit", option: string) =>
    setValues((current) => {
      const picked = current[key];
      return {
        ...current,
        [key]: picked.includes(option) ? picked.filter((item) => item !== option) : [...picked, option],
      };
    });

  const failing = useMemo(() => new Set(CHECKS.filter((check) => !check.ok(values)).map((check) => check.id)), [values]);
  const done = CHECKS.length - failing.size;

  const blocks = useMemo(() => {
    const reasons: string[] = [];
    if (values.level === DISQUALIFYING.level) reasons.push("100 level");
    if (values.cgpa === DISQUALIFYING.cgpa) reasons.push("CGPA below 2.20");
    return reasons;
  }, [values.level, values.cgpa]);

  const bad = (id: keyof Values) => (submitted && failing.has(id) ? "field bad" : "field");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");

    const first = CHECKS.find((check) => failing.has(check.id));
    if (first) {
      const node = formRef.current?.querySelector<HTMLElement>(`[data-field="${first.id}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.querySelector<HTMLElement>("input,textarea")?.focus({ preventScroll: true });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/programmes/${programme.slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not submit your application.");
      setReceipt({ reference: result.reference, emailSent: Boolean(result.emailSent), values });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "We could not submit your application.");
    } finally {
      setBusy(false);
    }
  }

  const monitorClass = blocks.length ? "monitor is-blocked" : values.level && values.cgpa ? "monitor is-clear" : "monitor";
  const monitorState = blocks.length
    ? "Not eligible this cycle"
    : values.level && values.cgpa
      ? "You meet the criteria"
      : "Waiting on your level and CGPA";
  const monitorWhy = blocks.length
    ? `${blocks.join(" and ")} falls outside the criteria for this intake.`
    : values.level && values.cgpa
      ? `${values.level} · CGPA ${values.cgpa}. Finish the rest and submit.`
      : "These two answers decide whether your application can go forward.";

  const left = CHECKS.length - done;
  const statusLine = blocks.length
    ? "Submission is closed for this application while an eligibility criterion isn't met."
    : left === 0
      ? "All answers in. Review once, then submit."
      : `${left} ${left === 1 ? "answer" : "answers"} to go.`;

  return (
    <div className="ca">
      <div className="shell">
        <aside className="rail">
          <div className="mark">
            <span />
            CFG Africa
          </div>
          <h1>
            Campus
            <br />
            Ambassador
            <br />
            <em>Programme</em>
          </h1>
          <p className="lede">
            Covenant University intake. Represent CFG Africa on campus, build a professional record, and take the
            training before the cohort starts.
          </p>

          <ul className="facts">
            <li>
              <span className="k">Campus</span>
              <span className="v">Covenant University</span>
            </li>
            <li>
              <span className="k">Open to</span>
              <span className="v">200 – 500 level</span>
            </li>
            <li>
              <span className="k">Minimum CGPA</span>
              <span className="v">2.20</span>
            </li>
            <li>
              <span className="k">Training</span>
              <span className="v">3 days, virtual</span>
            </li>
          </ul>

          {!receipt && (
            <div className={monitorClass}>
              <span className="k">Eligibility check</span>
              <p className="state">{monitorState}</p>
              <p className="why">{monitorWhy}</p>
              <div className="meter">
                <i style={{ width: `${(done / CHECKS.length) * 100}%` }} />
              </div>
              <div className="count">
                {done} of {CHECKS.length} answered
              </div>
            </div>
          )}

          <p className="foot">Private &amp; Confidential · CFG Africa</p>
        </aside>

        <main className="panel">
          {isTest && (
            <p className="test-banner">
              TEST MODE — this form is not live yet. Anything submitted here is discarded when the programme is
              published.
            </p>
          )}

          {receipt ? (
            <div className="receipt">
              <span className="stamp">Application recorded</span>
              <h2>Thanks — that&rsquo;s everything we need.</h2>
              <p className="note">
                Shortlisted applicants are contacted on the WhatsApp number below with training dates.{" "}
                {receipt.emailSent
                  ? "A copy of this reference has been emailed to you."
                  : "We could not send a confirmation email, so please save your reference now."}
              </p>

              <div className="reference">
                <span className="k">Your application reference</span>
                <p className="v">{receipt.reference}</p>
              </div>

              <dl>
                {[
                  ["Full name", receipt.values.name],
                  ["Phone / WhatsApp", receipt.values.phone],
                  ["Institutional email", receipt.values.email],
                  ["Level of study", receipt.values.level],
                  ["Department & college", receipt.values.dept],
                  ["CGPA", receipt.values.cgpa],
                  ["About you", receipt.values.about],
                  ["Why you're applying", receipt.values.why],
                  ["Leadership experience", receipt.values.exp.join("\n")],
                  ["Commitments confirmed", receipt.values.commit.join("\n")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <form ref={formRef} onSubmit={submit} noValidate>
              {/* Section 1 */}
              <section className="sec">
                <div className="eyebrow">
                  <b>01</b> — Basic information
                </div>
                <h2>Who you are</h2>
                <p className="note">
                  We use your institutional address to confirm you&rsquo;re a current Covenant University student.
                </p>

                <div className={bad("name")} data-field="name">
                  <label className="q" htmlFor="ca-name">
                    Full name <span className="req">*</span>
                  </label>
                  <input
                    id="ca-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Surname first, as it appears on your student record"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                  <span className="err">Enter your full name.</span>
                </div>

                <div className={bad("phone")} data-field="phone">
                  <label className="q" htmlFor="ca-phone">
                    Phone / WhatsApp number <span className="req">*</span>
                  </label>
                  <span className="hint">
                    We run cohort coordination on WhatsApp, so use a number that&rsquo;s active there.
                  </span>
                  <input
                    id="ca-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0801 234 5678"
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                  <span className="err">Enter a phone number of at least 10 digits.</span>
                </div>

                <div className={bad("email")} data-field="email">
                  <label className="q" htmlFor="ca-email">
                    Institutional email address <span className="req">*</span>
                  </label>
                  <span className="hint">
                    Must end in {INSTITUTIONAL_DOMAIN} — personal addresses aren&rsquo;t accepted.
                  </span>
                  <input
                    id="ca-email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder={`firstname.lastname${INSTITUTIONAL_DOMAIN}`}
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  <span className="err">Use your {INSTITUTIONAL_DOMAIN} address.</span>
                </div>
              </section>

              {/* Section 2 */}
              <section className="sec">
                <div className="eyebrow">
                  <b>02</b> — Eligibility &amp; academic standing
                </div>
                <h2>Where you are academically</h2>

                <div className={bad("level")} data-field="level">
                  <fieldset>
                    <legend className="q">
                      Current level of study <span className="req">*</span>
                    </legend>
                    <div className="opts cols" role="radiogroup">
                      {LEVEL_OPTIONS.map((option) => (
                        <label key={option} className={option === DISQUALIFYING.level ? "opt flagged" : "opt"}>
                          <input
                            type="radio"
                            name="level"
                            value={option}
                            checked={values.level === option}
                            onChange={() => set("level", option)}
                          />
                          <span>
                            {option}
                            {option === DISQUALIFYING.level && <span className="tag">Not eligible this cycle</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    {values.level === DISQUALIFYING.level && (
                      <div className="notice">
                        <strong>100 level applications aren&rsquo;t accepted this cycle.</strong>
                        <p>
                          Ambassadors need a full academic year on campus behind them. Apply again from 200 level.
                        </p>
                      </div>
                    )}
                    <span className="err">Select your current level.</span>
                  </fieldset>
                </div>

                <div className={bad("dept")} data-field="dept">
                  <label className="q" htmlFor="ca-dept">
                    Department &amp; college <span className="req">*</span>
                  </label>
                  <input
                    id="ca-dept"
                    type="text"
                    placeholder="e.g. Mass Communication / CLDS"
                    value={values.dept}
                    onChange={(e) => set("dept", e.target.value)}
                  />
                  <span className="err">Enter your department and college.</span>
                </div>

                <div className={bad("cgpa")} data-field="cgpa">
                  <fieldset>
                    <legend className="q">
                      Current cumulative grade point average <span className="req">*</span>
                    </legend>
                    <span className="hint">Use your most recent published CGPA. We may ask to see it later.</span>
                    <div className="opts cols" role="radiogroup">
                      {CGPA_OPTIONS.map((option) => (
                        <label key={option} className={option === DISQUALIFYING.cgpa ? "opt flagged" : "opt"}>
                          <input
                            type="radio"
                            name="cgpa"
                            value={option}
                            checked={values.cgpa === option}
                            onChange={() => set("cgpa", option)}
                          />
                          <span>
                            {option}
                            {option === DISQUALIFYING.cgpa && <span className="tag">Below minimum</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    {values.cgpa === DISQUALIFYING.cgpa && (
                      <div className="notice">
                        <strong>A CGPA of 2.20 or above is required.</strong>
                        <p>
                          The programme adds a real time commitment on top of coursework, so we hold this line.
                          You&rsquo;re welcome to apply in a later cycle.
                        </p>
                      </div>
                    )}
                    <span className="err">Select your CGPA range.</span>
                  </fieldset>
                </div>
              </section>

              {/* Section 3 */}
              <section className="sec">
                <div className="eyebrow">
                  <b>03</b> — Profile &amp; leadership potential
                </div>
                <h2>What you bring</h2>
                <p className="note">Write in your own voice. Specific beats polished.</p>

                <div className={bad("about")} data-field="about">
                  <label className="q" htmlFor="ca-about">
                    Tell us about yourself <span className="req">*</span>
                  </label>
                  <span className="hint">
                    Your background, and the interests or skills you&rsquo;d bring to the role. {ABOUT_MAX_WORDS} words
                    maximum.
                  </span>
                  <textarea
                    id="ca-about"
                    placeholder="Start anywhere — what you study, what you spend time on, what you're good at."
                    value={values.about}
                    onChange={(e) => set("about", e.target.value)}
                  />
                  <div className={countWords(values.about) > ABOUT_MAX_WORDS ? "wc over" : "wc"}>
                    <span>
                      {countWords(values.about)} / {ABOUT_MAX_WORDS} words
                    </span>
                  </div>
                  <span className="err">Tell us about yourself, within {ABOUT_MAX_WORDS} words.</span>
                </div>

                <div className={bad("why")} data-field="why">
                  <label className="q" htmlFor="ca-why">
                    Why do you want to be a CFG Africa Campus Ambassador at CU? <span className="req">*</span>
                  </label>
                  <span className="hint">{WHY_MAX_WORDS} words maximum.</span>
                  <textarea
                    id="ca-why"
                    style={{ minHeight: 100 }}
                    placeholder="What you want out of it, and what you'd do with it on campus."
                    value={values.why}
                    onChange={(e) => set("why", e.target.value)}
                  />
                  <div className={countWords(values.why) > WHY_MAX_WORDS ? "wc over" : "wc"}>
                    <span>
                      {countWords(values.why)} / {WHY_MAX_WORDS} words
                    </span>
                  </div>
                  <span className="err">Tell us why you&rsquo;re applying, within {WHY_MAX_WORDS} words.</span>
                </div>

                <div className={bad("exp")} data-field="exp">
                  <fieldset>
                    <legend className="q">
                      Leadership &amp; community experience <span className="req">*</span>
                    </legend>
                    <span className="hint">
                      Which of these describes your campus activity? Select all that apply.
                    </span>
                    <div className="opts">
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <label key={option} className="opt">
                          <input
                            type="checkbox"
                            checked={values.exp.includes(option)}
                            onChange={() => toggle("exp", option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <span className="err">Select at least one option.</span>
                  </fieldset>
                </div>
              </section>

              {/* Section 4 */}
              <section className="sec">
                <div className="eyebrow">
                  <b>04</b> — Programme commitment
                </div>
                <h2>What you&rsquo;re agreeing to</h2>
                <p className="note">All three are mandatory for selected ambassadors. Tick each one to confirm.</p>

                <div className={bad("commit")} data-field="commit">
                  <fieldset>
                    <legend className="sr">Availability confirmation</legend>
                    <div className="opts">
                      {COMMITMENT_OPTIONS.map((option) => (
                        <label key={option} className="opt">
                          <input
                            type="checkbox"
                            checked={values.commit.includes(option)}
                            onChange={() => toggle("commit", option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <span className="err">Confirm all three commitments to continue.</span>
                  </fieldset>
                </div>
              </section>

              {serverError && <p className="server-error">{serverError}</p>}

              <div className="actions">
                <button type="submit" className="btn" disabled={busy || blocks.length > 0}>
                  {busy ? "Submitting…" : "Submit application"}
                </button>
                <span className="status">
                  {submitted && failing.size > 0 && !blocks.length
                    ? "Some answers still need attention — the first one is highlighted."
                    : statusLine}
                </span>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
