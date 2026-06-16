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
              <NavItem to="/" label="Dashboard" />
              <NavItem to="/clientes" label="Clientes" />
              <NavItem to="/movimientos" label="Movimientos" />
              <NavItem to="/productos" label="Productos" />
              <NavItem to="/proveedores" label="Proveedores" />
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

