import { NavLink, Outlet } from "react-router-dom";


function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-lg text-sm font-medium transition",
          isActive
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25"
            : "text-slate-600 hover:bg-violet-100/60 hover:text-violet-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        ].join(" ")
      }
      end={to === "/"}
    >
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-indigo-50/40 to-violet-50/30 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
              F
            </span>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">FEBRIEL CRM</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Panel
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <nav className="flex flex-wrap gap-1.5">
              <NavItem to="/" label="Caja Diaria" />
              <NavItem to="/ventas" label="Ventas" />
              <NavItem to="/clientes" label="Clientes" />
              <NavItem to="/productos" label="Productos" />
              <NavItem to="/proveedores" label="Proveedores" />
              <NavItem to="/metricas" label="Metricas" />
            </nav>
            <NavLink
              to="/configuracion"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Configuracion"
              title="Configuracion"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 1 1 0-4h.09a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.1-1.65V3a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1H21a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z" />
              </svg>
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

