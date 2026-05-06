import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import DashboardPage from "../pages/DashboardPage";
import CustomersPage from "../pages/CustomersPage";
import InventoryPage from "../pages/InventoryPage";
import SalesPage from "../pages/SalesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/inventario" element={<InventoryPage />} />
        <Route path="/ventas" element={<SalesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

