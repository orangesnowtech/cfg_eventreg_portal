"use client";

import { useState } from "react";
import type { EventRecord } from "@/types/event";

export default function DynamicRegistrationForm({ event }: { event: EventRecord }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (id: string, value: string | boolean) => setValues((current) => ({ ...current, [id]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/events/${event.id}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Registration failed");
      setAccessCode(result.accessCode); setEmailSent(Boolean(result.emailSent)); setMessage(result.message); setValues({});
    } catch (error) { setMessage(error instanceof Error ? error.message : "Registration failed"); }
    finally { setBusy(false); }
  }

  const testBanner = event.status === "testing" ? <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-900">TEST MODE — this form is not live yet. Anything submitted here is discarded when the event is published.</p> : null;

  const mode = event.accessMode || "code";
  const showCode = mode === "code" || mode === "both";
  const showLink = (mode === "link" || mode === "both") && Boolean(event.joinUrl);

  if (accessCode) return <div className="rounded-2xl bg-white p-8 text-center shadow-xl">{testBanner}<p className="mb-5 text-lg text-green-700">{message}</p>
    {showCode && <><p className="text-sm font-semibold text-gray-500">YOUR ACCESS CODE</p><p className="my-3 font-mono text-5xl font-bold tracking-[0.3em] text-cfg-primary">{accessCode}</p><p className="text-gray-600">Save this code for check-in.</p></>}
    {showLink && <div className={showCode ? "mt-8 border-t pt-6" : ""}><p className="text-sm font-semibold text-gray-500">JOINING LINK</p><a href={event.joinUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-cfg-secondary px-6 py-3 font-bold text-cfg-primary">Join the event</a><p className="mt-3 break-all text-xs text-gray-500">{event.joinUrl}</p>{event.joinInstructions && <p className="mt-3 text-sm text-gray-600">{event.joinInstructions}</p>}</div>}
    <p className="mt-6 text-sm text-gray-500">{emailSent ? "We've emailed these details to you." : "Please save these details now — we could not send a confirmation email."}</p>
    <button onClick={() => setAccessCode("")} className="mt-6 rounded-lg bg-cfg-primary px-5 py-3 font-semibold text-white">Register another person</button></div>;
  return <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl md:p-8">{testBanner}<h2 className="mb-2 text-2xl font-bold text-cfg-primary">{event.form.title}</h2><p className="mb-6 text-gray-600">{event.form.introText}</p>{message && <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}<div className="grid gap-5 md:grid-cols-2">
    {event.form.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "md:col-span-2" : ""}><span className="mb-1 block font-medium text-gray-800">{field.label}{field.required && <b className="text-red-500"> *</b>}</span>{field.type === "textarea" ? <textarea required={field.required} value={String(values[field.id] || "")} placeholder={field.placeholder} onChange={(e) => update(field.id, e.target.value)} className="min-h-28 w-full rounded-lg border border-gray-300 p-3" /> : field.type === "select" || field.type === "radio" ? <select required={field.required} value={String(values[field.id] || "")} onChange={(e) => update(field.id, e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-3"><option value="">Select an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "checkbox" ? <span className="flex items-center gap-2"><input type="checkbox" checked={Boolean(values[field.id])} onChange={(e) => update(field.id, e.target.checked)} required={field.required} /> <span className="text-sm text-gray-600">Yes</span></span> : <input required={field.required} type={field.type === "phone" ? "tel" : field.type} value={String(values[field.id] || "")} placeholder={field.placeholder} onChange={(e) => update(field.id, e.target.value)} className="w-full rounded-lg border border-gray-300 p-3" />}{field.helpText && <small className="mt-1 block text-gray-500">{field.helpText}</small>}</label>)}
  </div><button disabled={busy} className="mt-7 w-full rounded-lg bg-cfg-secondary px-5 py-3 font-bold text-cfg-primary disabled:opacity-50">{busy ? "Submitting…" : "Submit registration"}</button></form>;
}