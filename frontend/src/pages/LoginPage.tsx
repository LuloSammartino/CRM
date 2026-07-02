import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api, getAuthToken, setAuthToken } from "../lib/api";

type Props = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusPassword(event: KeyboardEvent) {
      if (
        document.activeElement === passwordInputRef.current ||
        document.activeElement !== document.body ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) return;

      passwordInputRef.current?.focus();
      if (event.key.length === 1) {
        event.preventDefault();
        setPassword((current) => current + event.key);
      }
    }

    window.addEventListener("keydown", focusPassword);
    return () => window.removeEventListener("keydown", focusPassword);
  }, []);

  if (getAuthToken()) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const session = await api.login(password);
      setAuthToken(session.token);
      onLogin();
    } catch {
      setError("Contraseña incorrecta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-lg font-bold">FEBRIEL CRM</h1>
        <label className="mt-5 block text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Contraseña</span>
          <div className="mt-1 flex rounded-md border border-slate-300 bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:border-slate-600 dark:bg-slate-800">
            <input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none dark:text-slate-100"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="px-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            >
              {showPassword ? (
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
        {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
