"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

const MIN_PASSWORD = 6;
const input =
  "w-full px-3 py-2 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent";

/**
 * Lets any signed-in admin change their own password. Firebase only accepts a
 * password change from a recent sign-in, so the current password is checked
 * first; that also stops someone at an unattended laptop from changing it.
 */
export default function ChangePassword() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const close = () => {
    setOpen(false);
    setValues({ current: "", next: "", confirm: "" });
    setVisible(false);
    setError("");
    setDone(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setError("");
    if (values.next.length < MIN_PASSWORD) return setError(`The new password must be at least ${MIN_PASSWORD} characters.`);
    if (values.next !== values.confirm) return setError("The new passwords do not match.");
    if (values.next === values.current) return setError("Choose a password different from your current one.");

    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, values.current));
      await updatePassword(user, values.next);
      setDone(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "Your current password is incorrect."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Wait a few minutes and try again."
          : code === "auth/weak-password"
          ? `The new password must be at least ${MIN_PASSWORD} characters.`
          : "Could not change your password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof values, label: string, autoComplete: string) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        className={input}
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <KeyRound className="w-4 h-4" />
        Change password
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onClick={(e) => e.target === e.currentTarget && !busy && close()}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="change-password-title" className="mb-4 text-lg font-semibold text-gray-900">
              Change your password
            </h2>
            {done ? (
              <>
                <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                  Your password has been changed. Use the new one next time you sign in.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {field("current", "Current password", "current-password")}
                {field("next", `New password (minimum ${MIN_PASSWORD} characters)`, "new-password")}
                {field("confirm", "Confirm new password", "new-password")}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Show passwords
                </label>
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Change password"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
