import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import DashboardPage from "../pages/DashboardPage";
import CustomersPage from "../pages/CustomersPage";
import InventoryPage from "../pages/InventoryPage";
import ProvidersPage from "../pages/ProvidersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/productos" element={<InventoryPage />} />
        <Route path="/proveedores" element={<ProvidersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

