"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { EventAccessMode, EventField, EventFieldType, EventRecord } from "@/types/event";

const FIELD_TYPES: EventFieldType[] = [
  "text",
  "email",
  "phone",
  "url",
  "textarea",
  "select",
  "radio",
  "date",
  "number",
  "checkbox",
];

// The register API derives the attendee name and email from these keys, so they stay fixed.
const LOCKED_FIELD_COUNT = 3;

/**
 * Where a record's form actually lives. Programmes share this dashboard but are
 * served by /programmes/[slug]; sending them to /events/[slug] is a 404.
 */
function publicPath(record: Pick<EventRecord, "kind" | "slug">) {
  return record.kind === "programme" ? `/programmes/${record.slug}` : `/events/${record.slug}`;
}

/**
 * Programmes collect applications, events collect registrations. The buttons act
 * on the same status field either way; only the wording changes.
 */
function intakeNoun(record: Pick<EventRecord, "kind">) {
  return record.kind === "programme" ? "applications" : "registration";
}

const starterFields: EventField[] = [
  { id: "firstName", label: "First name", type: "text", required: true },
  { id: "lastName", label: "Last name", type: "text", required: true },
  { id: "email", label: "Email address", type: "email", required: true },
];

const blank = {
  name: "",
  slug: "",
  description: "",
  venue: "",
  startAt: "",
  bannerUrl: "",
  accessMode: "code" as EventAccessMode,
  joinUrl: "",
  joinInstructions: "",
  emailFromName: "",
  remindersEnabled: true,
  formTitle: "Registration form",
  introText: "",
  fields: starterFields,
};

function formatAnswer(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  // Multi-select answers (programme checkbox groups) arrive as arrays; the default
  // stringification would run them together with bare commas.
  if (Array.isArray(raw)) return raw.length ? raw.join("; ") : "—";
  return String(raw);
}

function nextFieldId(fields: EventField[]) {
  const taken = new Set(fields.map((field) => field.id));
  let index = fields.length + 1;
  while (taken.has(`field_${index}`)) index += 1;
  return `field_${index}`;
}

export default function EventManager() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [form, setForm] = useState(blank);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldsLocked, setFieldsLocked] = useState(false);
  // Raw text of each choices input, keyed by field id. Kept separate from the parsed
  // options so that typing a comma (or a space after one) is not erased mid-keystroke.
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [attendees, setAttendees] = useState<Record<string, unknown>[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcast, setBroadcast] = useState({ subject: "", message: "" });
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastNote, setBroadcastNote] = useState("");
  const [error, setError] = useState("");

  // Programmes appear in this dashboard but their form is defined in code, so the
  // builder is read-only for them and the API rejects any PATCH carrying fields.
  const editingProgramme = events.find((e) => e.id === editingId)?.kind === "programme";
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const token = useCallback(async () => (user ? user.getIdToken() : ""), [user]);

  const load = useCallback(async () => {
    const t = await token();
    // no-store: this GET is identical before and after a save, so the browser
    // would otherwise serve a cached copy and the list would look unchanged.
    const response = await fetch("/api/events", {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
    if (response.ok) setEvents((await response.json()).events || []);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadBanner(file: File) {
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const t = await token();
      const response = await fetch("/api/events/banner", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not upload that image.");
        return;
      }
      setForm((current) => ({ ...current, bannerUrl: result.url }));
    } finally {
      setUploading(false);
    }
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setFieldsLocked(false);
    setOptionDrafts({});
    setForm(blank);
    setShowBuilder(true);
  }

  function openEdit(event: EventRecord) {
    setError("");
    setEditingId(event.id);
    setFieldsLocked((event.registrationCount || 0) > 0);
    setOptionDrafts({});
    setForm({
      name: event.name,
      slug: event.slug,
      description: event.description || "",
      venue: event.venue || "",
      startAt: (event.startAt || "").slice(0, 16),
      bannerUrl: event.bannerUrl || "",
      accessMode: (event.accessMode || "code") as EventAccessMode,
      joinUrl: event.joinUrl || "",
      joinInstructions: event.joinInstructions || "",
      emailFromName: event.emailFromName || "",
      // Events created before reminders existed have no flag and are opted in.
      remindersEnabled: event.remindersEnabled !== false,
      formTitle: event.form.title,
      introText: event.form.introText || "",
      fields: event.form.fields,
    });
    setShowBuilder(true);
  }

  function closeBuilder() {
    setShowBuilder(false);
    setEditingId(null);
    setFieldsLocked(false);
    setOptionDrafts({});
    setForm(blank);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const t = await token();
      // The slug is part of the published URL, so it is only set at creation time.
      const payload = {
        name: form.name,
        description: form.description,
        venue: form.venue,
        startAt: form.startAt,
        bannerUrl: form.bannerUrl,
        accessMode: form.accessMode,
        joinUrl: form.joinUrl,
        joinInstructions: form.joinInstructions,
        emailFromName: form.emailFromName,
        remindersEnabled: form.remindersEnabled,
        ...(editingProgramme
          ? {}
          : {
              form: {
                title: form.formTitle,
                introText: form.introText,
                fields: form.fields,
              },
            }),
        ...(editingId ? {} : { slug: form.slug }),
      };
      const response = await fetch(
        editingId ? `/api/events/${editingId}` : "/api/events",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not save this event.");
        return;
      }
      closeBuilder();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(event: EventRecord, status: string) {
    const t = await token();
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function publishEvent(event: EventRecord) {
    const tests = event.testCount || 0;
    const warning = tests
      ? `Publish "${event.name}"?\n\nThis deletes ${tests} test submission(s) and starts collecting real registrations. The form fields lock once the first real person registers.`
      : `Publish "${event.name}"?\n\nThe form fields lock once the first real person registers.`;
    if (!confirm(warning)) return;
    await changeStatus(event, "published");
  }

  /**
   * Stops new submissions while leaving the record published: an event stays in
   * the public archive, and everything already collected is untouched.
   */
  async function closeEvent(event: EventRecord) {
    const noun = intakeNoun(event);
    if (
      !confirm(
        `Close ${noun} for "${event.name}"?\n\nThe form stops accepting new submissions and its link no longer opens. Everything already collected is kept, and you can reopen it at any time.`
      )
    )
      return;
    await changeStatus(event, "closed");
  }

  async function reopenEvent(event: EventRecord) {
    const noun = intakeNoun(event);
    if (
      !confirm(
        `Reopen ${noun} for "${event.name}"?\n\nThe form goes live again at ${publicPath(event)} and starts accepting new submissions.`
      )
    )
      return;
    await changeStatus(event, "published");
  }

  async function unpublishEvent(event: EventRecord) {
    const registered = event.registrationCount || 0;
    const warning = registered
      ? `Unpublish "${event.name}"?\n\nIt will be removed from the homepage and events list, and stop accepting registrations. The ${registered} existing registration(s) are kept. You can publish it again later.`
      : `Unpublish "${event.name}"?\n\nIt will be removed from the homepage and events list, and stop accepting registrations. You can publish it again later.`;
    if (!confirm(warning)) return;
    await changeStatus(event, "draft");
  }

  async function toggleFeatured(event: EventRecord) {
    const t = await token();
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ featured: !event.featured }),
    });
    load();
  }

  async function viewAttendees(event: EventRecord) {
    setSelected(event);
    setDetail(null);
    setShowBroadcast(false);
    setBroadcast({ subject: "", message: "" });
    setBroadcastNote("");
    const t = await token();
    const response = await fetch(`/api/events/${event.id}/registrations`, {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
    setAttendees((await response.json()).registrations || []);
  }

  function addField() {
    setForm({
      ...form,
      fields: [
        ...form.fields,
        {
          id: nextFieldId(form.fields),
          label: "New field",
          type: "text",
          required: false,
        },
      ],
    });
  }

  function updateField(index: number, patch: Partial<EventField>) {
    setForm({
      ...form,
      fields: form.fields.map((field, i) =>
        i === index ? { ...field, ...patch } : field
      ),
    });
  }

  async function resendConfirmation(attendee: Record<string, unknown>) {
    if (!selected) return;
    setResending(true);
    setResendNote("");
    try {
      const t = await token();
      const response = await fetch(`/api/events/${selected.id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ registrationId: attendee.id }),
      });
      const result = await response.json();
      setResendNote(response.ok ? "Confirmation email sent." : result.error || "Could not send.");
    } finally {
      setResending(false);
    }
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBroadcastBusy(true);
    setBroadcastNote("");
    try {
      const t = await token();
      const response = await fetch(`/api/events/${selected.id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(broadcast),
      });
      const result = await response.json();
      if (!response.ok) {
        setBroadcastNote(result.error || "Could not send broadcast.");
        return;
      }
      setBroadcastNote(
        `Sent to ${result.sent} of ${result.total} registrant(s)${result.failed ? ` · ${result.failed} failed` : ""}.`
      );
      setBroadcast({ subject: "", message: "" });
    } finally {
      setBroadcastBusy(false);
    }
  }

  function exportAttendees() {
    if (!selected || attendees.length === 0) return;
    // Arrays are joined rather than stringified so a multi-select answer reads as
    // one cell instead of a comma run that looks like extra columns.
    const escape = (value: unknown) =>
      `"${(Array.isArray(value) ? value.join("; ") : String(value ?? "")).replace(/"/g, '""')}"`;
    const header = [
      ...selected.form.fields.map((field) => field.label),
      "Access code",
      "Registered at",
      "Checked in",
    ];
    const rows = attendees.map((attendee) => {
      const values = (attendee.form || {}) as Record<string, unknown>;
      return [
        ...selected.form.fields.map((field) => values[field.id]),
        attendee.accessCode,
        attendee.registeredAt,
        attendee.checkedIn ? "Yes" : "No",
      ]
        .map(escape)
        .join(",");
    });
    const blob = new Blob([[header.map(escape).join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selected.slug}-registrations.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-cfg-primary">Events</h2>
          <p className="text-gray-600">
            Create events, design their registration forms, publish the link,
            and track attendees.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-cfg-primary px-5 py-3 font-semibold text-white"
        >
          Create event
        </button>
      </div>

      {showBuilder && (
        <form
          onSubmit={saveEvent}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 text-xl font-bold">
            {editingId ? "Edit event and registration form" : "Event and registration form"}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              required
              placeholder="Event name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border p-3"
            />
            {editingId ? (
              <p className="rounded border border-dashed bg-gray-50 p-3 text-sm text-gray-500">
                {editingProgramme ? "Application link" : "Registration link"}:{" "}
                {editingProgramme ? "/programmes/" : "/events/"}
                {form.slug} (cannot be changed)
              </p>
            ) : (
              <input
                placeholder="URL slug (optional)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="rounded border p-3"
              />
            )}
            <input
              placeholder="Venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="rounded border p-3"
            />
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              className="rounded border p-3"
            />
            <textarea
              placeholder="Event description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded border p-3 md:col-span-2"
            />

            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Email sender name (optional)"
                value={form.emailFromName}
                onChange={(e) => setForm({ ...form, emailFromName: e.target.value })}
                maxLength={78}
                className="w-full rounded border p-3"
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown as the sender on every email for this event. Leave blank to use the default,
                &ldquo;CFG Africa Events&rdquo;. The sending address never changes.
              </p>
            </div>

            <div className="md:col-span-2 rounded-lg border bg-gray-50 p-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.remindersEnabled}
                  onChange={(e) => setForm({ ...form, remindersEnabled: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-gray-700">Send automatic reminder emails</span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Registrants are emailed 3 days, 24 hours, 3 hours, 1 hour and 5 minutes before
                    the start time. Reminders only go out once the event is published and dated.
                  </span>
                </span>
              </label>
            </div>
            <input
              required
              placeholder="Form title"
              value={form.formTitle}
              onChange={(e) => setForm({ ...form, formTitle: e.target.value })}
              className="rounded border p-3"
            />
            <input
              placeholder="Form intro"
              value={form.introText}
              onChange={(e) => setForm({ ...form, introText: e.target.value })}
              className="rounded border p-3"
            />

            <div className="md:col-span-2 rounded-lg border bg-gray-50 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                What do attendees receive?
              </label>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["code", "Access code (in person)"],
                    ["link", "Joining link (virtual)"],
                    ["both", "Both (hybrid)"],
                  ] as [EventAccessMode, string][]
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="accessMode"
                      checked={form.accessMode === value}
                      onChange={() => setForm({ ...form, accessMode: value })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {form.accessMode !== "code" && (
                <div className="mt-4 grid gap-3">
                  <input
                    required
                    type="url"
                    placeholder="Joining link, e.g. https://zoom.us/j/123456789"
                    value={form.joinUrl}
                    onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
                    className="rounded border p-3"
                  />
                  <input
                    placeholder="Joining instructions (optional) — passcode, dial-in, etc."
                    value={form.joinInstructions}
                    onChange={(e) =>
                      setForm({ ...form, joinInstructions: e.target.value })
                    }
                    className="rounded border p-3"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Flyer / banner
              </label>
              {form.bannerUrl ? (
                <div className="flex flex-wrap items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.bannerUrl}
                    alt="Event banner preview"
                    className="h-28 w-auto max-w-full rounded border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bannerUrl: "" })}
                    className="text-sm font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadBanner(file);
                    e.target.value = "";
                  }}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-cfg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              )}
              <p className="mt-2 text-xs text-gray-500">
                {uploading
                  ? "Uploading…"
                  : "JPG, PNG, or WebP up to 5MB. Shown on the homepage, the events list, and the registration page."}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between">
              <h4 className="font-semibold">Fields</h4>
              {!fieldsLocked && (
                <button
                  type="button"
                  onClick={addField}
                  className="text-sm font-semibold text-blue-700"
                >
                  + Add field
                </button>
              )}
            </div>
            {editingProgramme && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                This programme&rsquo;s form is defined in code, not here. Anything
                you change in the fields below is ignored on save — edit
                lib/programmes and re-run the seed script instead. The name,
                description and email sender name above do still save.
              </p>
            )}
            {fieldsLocked && !editingProgramme && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                This event already has registrations, so the form fields are
                locked — changing them would invalidate answers that have
                already been collected. Event details and the form heading below
                can still be edited. To collect different data, close this event
                and create a new one.
              </p>
            )}
            {form.fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded border p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_150px_auto_auto]">
                  <input
                    required
                    disabled={fieldsLocked}
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    className="rounded border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <select
                    disabled={fieldsLocked}
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as EventFieldType,
                      })
                    }
                    className="rounded border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      disabled={fieldsLocked}
                      checked={field.required}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                    />{" "}
                    Required
                  </label>
                  {!fieldsLocked && index >= LOCKED_FIELD_COUNT && (
                    <button
                      type="button"
                      onClick={() => {
                        setOptionDrafts((drafts) => {
                          const next = { ...drafts };
                          delete next[field.id];
                          return next;
                        });
                        setForm({
                          ...form,
                          fields: form.fields.filter((_, i) => i !== index),
                        });
                      }}
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {(field.type === "select" || field.type === "radio") && (
                  <input
                    required
                    disabled={fieldsLocked}
                    placeholder="Choices, separated by commas (e.g. Student, Professional, Other)"
                    value={optionDrafts[field.id] ?? field.options?.join(", ") ?? ""}
                    onChange={(e) => {
                      const text = e.target.value;
                      setOptionDrafts((drafts) => ({ ...drafts, [field.id]: text }));
                      updateField(index, {
                        options: text
                          .split(",")
                          .map((option) => option.trim())
                          .filter(Boolean),
                      });
                    }}
                    className="w-full rounded border p-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={saving}
              className="rounded bg-cfg-secondary px-5 py-3 font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={closeBuilder}
              className="rounded border px-5 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-bold text-cfg-primary">
                  {event.name}
                </h3>
                <p className="text-sm text-gray-500">{publicPath(event)}</p>
              </div>
              <span
                className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  event.status === "testing"
                    ? "bg-amber-100 text-amber-900"
                    : event.status === "published"
                      ? "bg-green-100 text-green-800"
                      : event.status === "closed"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100"
                }`}
              >
                {event.status === "published" ? "open" : event.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {event.form.fields.length} form fields ·{" "}
              {event.registrationCount || 0}{" "}
              {event.kind === "programme" ? "applied" : "registered"}
              {event.testCount ? ` · ${event.testCount} test` : ""}
              {event.venue && ` · ${event.venue}`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {event.status === "draft" && (
                <button
                  onClick={() => changeStatus(event, "testing")}
                  className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Start testing
                </button>
              )}
              {event.status === "testing" && (
                <>
                  <button
                    onClick={() => publishEvent(event)}
                    className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => changeStatus(event, "draft")}
                    className="rounded border px-3 py-2 text-sm font-semibold"
                  >
                    Back to draft
                  </button>
                </>
              )}
              {event.status === "published" && (
                <button
                  onClick={() => closeEvent(event)}
                  className="rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Close {intakeNoun(event)}
                </button>
              )}
              {event.status === "closed" && (
                <button
                  onClick={() => reopenEvent(event)}
                  className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Reopen {intakeNoun(event)}
                </button>
              )}
              {(event.status === "published" || event.status === "closed") && (
                <button
                  onClick={() => unpublishEvent(event)}
                  className="rounded border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700"
                >
                  Unpublish
                </button>
              )}
              {event.status === "published" && event.kind !== "programme" && (
                <button
                  onClick={() => toggleFeatured(event)}
                  className={`rounded px-3 py-2 text-sm font-semibold ${
                    event.featured
                      ? "bg-cfg-secondary text-cfg-primary"
                      : "border"
                  }`}
                >
                  {event.featured ? "★ Featured" : "Feature on homepage"}
                </button>
              )}
              <button
                onClick={() => openEdit(event)}
                className="rounded border px-3 py-2 text-sm font-semibold"
              >
                {event.registrationCount ? "Edit details" : "Edit form"}
              </button>
              <button
                onClick={() => viewAttendees(event)}
                className="rounded border px-3 py-2 text-sm font-semibold"
              >
                {event.kind === "programme" ? "View applicants" : "View attendees"}
              </button>
              {event.status !== "draft" && (
                <a
                  href={publicPath(event)}
                  target="_blank"
                  className="rounded border px-3 py-2 text-sm font-semibold"
                >
                  {event.status === "testing"
                    ? "Open test form"
                    : event.status === "closed"
                      ? "Open closed page"
                      : "Open form"}
                </a>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500">
            No events yet. Create one to start collecting registrations.
          </p>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Attendees — {selected.name}</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowBroadcast((open) => !open);
                  setBroadcastNote("");
                }}
                disabled={attendees.length === 0}
                className="rounded border px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Email all
              </button>
              <button
                onClick={exportAttendees}
                disabled={attendees.length === 0}
                className="rounded border px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Export CSV
              </button>
              <button onClick={() => setSelected(null)} className="text-gray-500">
                Close
              </button>
            </div>
          </div>

          {showBroadcast && (
            <form
              onSubmit={sendBroadcast}
              className="mb-5 space-y-3 rounded-lg border bg-gray-50 p-4"
            >
              <p className="text-sm font-semibold text-gray-700">
                Email all registrants of {selected.name}
              </p>
              <input
                required
                placeholder="Subject"
                value={broadcast.subject}
                onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
                className="w-full rounded border p-3 text-sm"
              />
              <textarea
                required
                placeholder="Your message… (plain text; line breaks are kept)"
                value={broadcast.message}
                onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                className="min-h-32 w-full rounded border p-3 text-sm"
              />
              <div className="flex items-center gap-3">
                <button
                  disabled={broadcastBusy}
                  className="rounded bg-cfg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {broadcastBusy ? "Sending…" : "Send to all"}
                </button>
                {broadcastNote && (
                  <span className="text-sm text-gray-600">{broadcastNote}</span>
                )}
              </div>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Access code</th>
                  <th className="p-2">Registered</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => (
                  <tr key={String(attendee.id)} className="border-b">
                    <td className="p-2">
                      {String(attendee.name || "—")}
                      {Boolean(attendee.isTest) && (
                        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          TEST
                        </span>
                      )}
                    </td>
                    <td className="p-2">{String(attendee.email || "—")}</td>
                    <td className="p-2 font-mono font-bold">
                      {String(attendee.accessCode || "—")}
                    </td>
                    <td className="p-2">
                      {attendee.registeredAt
                        ? new Date(String(attendee.registeredAt)).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => {
                          setDetail(attendee);
                          setResendNote("");
                        }}
                        className="rounded border px-3 py-1 text-xs font-semibold"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendees.length === 0 && (
              <p className="py-8 text-center text-gray-500">
                No registrations yet.
              </p>
            )}
          </div>
        </div>
      )}

      {selected && detail && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="mt-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-cfg-primary">
                  {String(detail.name || "Registrant")}
                </h3>
                <p className="text-sm text-gray-500">{selected.name}</p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-gray-100 px-2 py-1 font-mono font-bold">
                {String(detail.accessCode || "—")}
              </span>
              <span
                className={`rounded px-2 py-1 font-semibold ${
                  detail.checkedIn
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {detail.checkedIn ? "Checked in" : "Not checked in"}
              </span>
              {Boolean(detail.isTest) && (
                <span className="rounded bg-amber-100 px-2 py-1 font-bold text-amber-900">
                  TEST
                </span>
              )}
              {Boolean(detail.registeredAt) && (
                <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                  {new Date(String(detail.registeredAt)).toLocaleString()}
                </span>
              )}
            </div>

            {Boolean(detail.email) && (
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => resendConfirmation(detail)}
                  disabled={resending}
                  className="rounded border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend confirmation email"}
                </button>
                {resendNote && (
                  <span className="text-sm text-gray-600">{resendNote}</span>
                )}
              </div>
            )}

            <dl className="divide-y">
              {selected.form.fields.map((field) => {
                const raw = (detail.form as Record<string, unknown> | undefined)?.[field.id];
                const value = formatAnswer(raw);
                return (
                  <div key={field.id} className="grid grid-cols-3 gap-3 py-2">
                    <dt className="col-span-1 text-sm font-medium text-gray-500">
                      {field.label}
                    </dt>
                    <dd className="col-span-2 text-sm break-words text-gray-900">
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
