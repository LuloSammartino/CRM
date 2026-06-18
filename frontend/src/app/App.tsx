import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { getAuthToken } from "../lib/api";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const CustomersPage = lazy(() => import("../pages/CustomersPage"));
const CashMovementsPage = lazy(() => import("../pages/CashMovementsPage"));
const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const ProvidersPage = lazy(() => import("../pages/ProvidersPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAuthToken()));

  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">Cargando...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => setIsLoggedIn(true)} />} />
        <Route element={isLoggedIn ? <AdminLayout /> : <Navigate to="/login" replace />}>
          <Route path="/ventas" element={<DashboardPage />} />
          <Route path="/clientes" element={<CustomersPage />} />
          <Route path="/" element={<CashMovementsPage />} />
          <Route path="/productos" element={<InventoryPage />} />
          <Route path="/proveedores" element={<ProvidersPage />} />
          <Route path="/configuracion" element={<SettingsPage onLogout={() => setIsLoggedIn(false)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

