import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const CustomersPage = lazy(() => import("../pages/CustomersPage"));
const CashMovementsPage = lazy(() => import("../pages/CashMovementsPage"));
const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const ProvidersPage = lazy(() => import("../pages/ProvidersPage"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/ventas" element={<DashboardPage />} />
          <Route path="/clientes" element={<CustomersPage />} />
          <Route path="/" element={<CashMovementsPage />} />
          <Route path="/productos" element={<InventoryPage />} />
          <Route path="/proveedores" element={<ProvidersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

