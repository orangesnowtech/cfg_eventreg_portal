import { z } from "zod";
import type { EventField } from "@/types/event";
import record from "./campus-ambassador.record.json";

/**
 * The Covenant University Campus Ambassador intake.
 *
 * This form is hardcoded rather than built in the admin form builder, because it
 * needs four things the builder's field vocabulary cannot express: multi-select
 * checkbox groups, word-limited free text, an institutional email domain, and
 * options that disqualify an applicant outright.
 *
 * campus-ambassador.record.json holds the labels and choices, and is the single
 * source of truth shared by three readers: the form component, the validation
 * schema below, and scripts/seed-campus-ambassador.mjs, which writes the same
 * definitions onto the programme's Firestore record so the admin dashboard and
 * CSV export can label the answers. Change a choice there, then re-run the seed.
 */

/** The JSON carries plain strings for `type`; they are EventFieldTypes by construction. */
export const CAMPUS_AMBASSADOR_FIELDS = record.form.fields as unknown as EventField[];

export const CAMPUS_AMBASSADOR_SLUG = record.slug;
export const CAMPUS_AMBASSADOR_NAME = record.name;

/** Applications are only accepted from a live Covenant University student address. */
export const INSTITUTIONAL_DOMAIN = "@stu.cu.edu.ng";

function optionsOf(id: string): string[] {
  const field = CAMPUS_AMBASSADOR_FIELDS.find((candidate) => candidate.id === id);
  if (!field?.options?.length) throw new Error(`campus-ambassador.record.json has no options for "${id}".`);
  return field.options;
}

export const LEVEL_OPTIONS = optionsOf("level");
export const CGPA_OPTIONS = optionsOf("cgpa");
export const EXPERIENCE_OPTIONS = optionsOf("exp");
export const COMMITMENT_OPTIONS = optionsOf("commit");

/**
 * Answers that end the application. Checked on the server as well as in the
 * browser: the client-side gate is a courtesy that stops someone filling in
 * eight more answers for nothing, not a control.
 */
export const DISQUALIFYING = { level: "100 Level", cgpa: "Below 2.20" } as const;

// A renamed choice would otherwise silently stop disqualifying anyone, which is
// the one drift here that loses money rather than just looking wrong.
if (!LEVEL_OPTIONS.includes(DISQUALIFYING.level) || !CGPA_OPTIONS.includes(DISQUALIFYING.cgpa)) {
  throw new Error("DISQUALIFYING no longer matches the choices in campus-ambassador.record.json.");
}

export const ABOUT_MAX_WORDS = 150;
export const WHY_MAX_WORDS = 100;

/** Counts words the same way the browser counter does, so the two never disagree. */
export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const wordLimited = (max: number, what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} is required.`)
    .refine((value) => countWords(value) <= max, `Keep ${what.toLowerCase()} to ${max} words or fewer.`);

const oneOf = (options: string[], message: string) => z.string().refine((value) => options.includes(value), message);

/** A checkbox group: no duplicates, every value drawn from the offered choices. */
const choices = (options: string[], min: number, message: string) =>
  z
    .array(z.string())
    .refine((picked) => picked.every((value) => options.includes(value)), "Unrecognised selection.")
    .refine((picked) => new Set(picked).size === picked.length, "Duplicate selections.")
    .refine((picked) => picked.length >= min, message);

export const campusAmbassadorSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(160),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a phone number of at least 10 digits."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .refine((value) => value.endsWith(INSTITUTIONAL_DOMAIN), `Use your ${INSTITUTIONAL_DOMAIN} address.`),
    level: oneOf(LEVEL_OPTIONS, "Select your current level."),
    dept: z.string().trim().min(2, "Enter your department and college.").max(200),
    cgpa: oneOf(CGPA_OPTIONS, "Select your CGPA range."),
    about: wordLimited(ABOUT_MAX_WORDS, "About you"),
    why: wordLimited(WHY_MAX_WORDS, "Why you're applying"),
    exp: choices(EXPERIENCE_OPTIONS, 1, "Select at least one option."),
    // All three commitments are mandatory, so the group is only valid when full.
    commit: choices(COMMITMENT_OPTIONS, COMMITMENT_OPTIONS.length, "Confirm all three commitments to continue."),
  })
  .strict();

export type CampusAmbassadorApplication = z.infer<typeof campusAmbassadorSchema>;

/**
 * Why this application cannot go forward, or null when it can. Separate from the
 * schema so the applicant gets the real reason rather than a validation error.
 */
export function disqualificationReason(values: CampusAmbassadorApplication): string | null {
  const failed: string[] = [];
  if (values.level === DISQUALIFYING.level) failed.push("100 level applications aren't accepted this cycle");
  if (values.cgpa === DISQUALIFYING.cgpa) failed.push("a CGPA of 2.20 or above is required");
  return failed.length ? `${failed.join(", and ")}.` : null;
}
