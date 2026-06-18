import { useState, type FormEvent } from "react";
import { api, clearAuthToken } from "../lib/api";

type Props = {
  onLogout: () => void;
};

export default function SettingsPage({ onLogout }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function logout() {
    clearAuthToken();
    onLogout();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== repeatPassword) {
      setError("Las contrasenas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Contrasena actualizada.");
    } catch {
      setError("No se pudo cambiar la contrasena.");
    } finally {
      setSaving(false);
    }
  }

  function passwordField(label: string, value: string, setValue: (value: string) => void, show: boolean, setShow: (value: boolean) => void) {
    return (
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex rounded-md border border-slate-300 bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:border-slate-600 dark:bg-slate-800">
          <input type={show ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none dark:text-slate-100" required />
          <button type="button" onClick={() => setShow(!show)} className="px-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" aria-label={show ? "Ocultar contrasena" : "Mostrar contrasena"} title={show ? "Ocultar contrasena" : "Mostrar contrasena"}>
            {show ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 4.24A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-4.05 5.16" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.11 6.11C3.49 7.91 2 12 2 12a18.6 18.6 0 0 0 7.89 7.07A10.6 10.6 0 0 0 12 19c.74 0 1.44-.08 2.1-.24" />
              </svg>
            )}
          </button>
        </div>
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Configuracion</h1>
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {passwordField("Contrasena actual", currentPassword, setCurrentPassword, showCurrentPassword, setShowCurrentPassword)}
        {passwordField("Nueva contrasena", newPassword, setNewPassword, showNewPassword, setShowNewPassword)}
        {passwordField("Repetir nueva contrasena", repeatPassword, setRepeatPassword, showRepeatPassword, setShowRepeatPassword)}
        {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        {message ? <div className="text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
        <button type="submit" disabled={saving} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {saving ? "Guardando..." : "Cambiar contrasena"}
        </button>
      </form>
      <button type="button" onClick={logout} className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        Salir
      </button>
    </div>
  );
}
