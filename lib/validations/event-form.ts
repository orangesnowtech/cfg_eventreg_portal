import { z } from "zod";
import type { EventField } from "@/types/event";

export function buildEventFormSchema(fields: EventField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let schema: z.ZodTypeAny = field.type === "number" ? z.coerce.number() : field.type === "checkbox" ? z.coerce.boolean() : z.string().trim();
    if (field.type === "email") schema = (schema as z.ZodString).email("Enter a valid email address");
    if (field.type === "url") schema = (schema as z.ZodString).url("Enter a valid URL");
    if (field.options?.length) schema = schema.refine((value) => field.options!.includes(String(value)), "Choose a valid option");
    if (field.required) schema = schema.refine((value) => value !== "" && value !== undefined && value !== null, "This field is required");
    else schema = schema.optional();
    shape[field.id] = schema;
  }
  return z.object(shape).strict();
}

/**
 * Shared create/edit validation for how attendees are admitted. Returns an error
 * message for the admin, or null when the settings are coherent.
 */
export function validateEventAccess(accessMode: unknown, joinUrl: unknown): string | null {
  if (accessMode === undefined || accessMode === null || accessMode === "") return null;
  if (!["code", "link", "both"].includes(String(accessMode))) return "Choose a valid attendee access option.";

  if (accessMode === "code") return null;

  const url = String(joinUrl || "").trim();
  if (!url) return "Add the webinar or meeting link attendees should join.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("bad protocol");
  } catch {
    return "The joining link must be a full URL, e.g. https://zoom.us/j/123456789";
  }
  return null;
}

/**
 * Shared create/edit validation for an event's form definition.
 * Returns an error message for the admin, or null when the form is valid.
 */
export function validateEventForm(form: unknown): string | null {
  const candidate = form as { title?: unknown; fields?: unknown } | null;
  if (!candidate?.title || typeof candidate.title !== "string" || !candidate.title.trim()) return "Give the registration form a title.";

  const fields = candidate.fields;
  if (!Array.isArray(fields) || fields.length === 0) return "Add at least one form field.";
  if (fields.length > 40) return "A form can have at most 40 fields.";

  // Report the first invalid field specifically, so the admin knows what to fix
  // rather than getting a blanket "one or more fields are invalid".
  for (const field of fields) {
    const reason = describeInvalidField(field);
    if (reason) return reason;
  }

  const typed = fields as EventField[];
  if (new Set(typed.map((field) => field.id)).size !== typed.length) return "Each form field needs a unique field key.";

  const missingOptions = typed.find((field) => (field.type === "select" || field.type === "radio") && !field.options?.length);
  if (missingOptions) return `Add at least one choice to the "${missingOptions.label}" field.`;

  return null;
}

const MAX_OPTIONS = 100;

const eventFieldSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,39}$/),
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "email", "phone", "url", "textarea", "select", "radio", "checkbox", "date", "number"]),
  required: z.boolean(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().trim().min(1).max(100)).max(MAX_OPTIONS).optional(),
  helpText: z.string().max(300).optional(),
});

export function isSafeEventField(value: unknown): value is EventField {
  return eventFieldSchema.safeParse(value).success;
}

/**
 * A human-readable reason why a field is invalid, or null when it is fine. Used to
 * give the admin an actionable message instead of a generic validation failure.
 */
function describeInvalidField(value: unknown): string | null {
  const result = eventFieldSchema.safeParse(value);
  if (result.success) return null;

  const label = (value as { label?: unknown })?.label;
  const name = typeof label === "string" && label.trim() ? `"${label.trim()}"` : "A field";
  const issue = result.error.issues[0];
  const path = issue.path.join(".");

  if (path.startsWith("options")) {
    const options = (value as { options?: unknown[] })?.options;
    if (Array.isArray(options) && options.length > MAX_OPTIONS) {
      return `${name} has ${options.length} choices; the limit is ${MAX_OPTIONS}.`;
    }
    return `${name} has an empty or over-long choice (each choice must be 1–100 characters).`;
  }
  if (path === "label") return `${name} needs a label of 1–100 characters.`;
  if (path === "id") return `${name} has an invalid field key.`;
  return `${name} is invalid: ${issue.message}.`;
}