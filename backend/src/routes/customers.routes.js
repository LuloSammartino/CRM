import { Router } from "express";
import {
  createCustomerPayment,
  createCustomer,
  deleteCustomer,
  getCustomerBalance,
  listCustomerMovements,
  listCustomersWithDebt,
  listCustomers,
  updateCustomer
} from "../controllers/customers.controller.js";

const router = Router();

// GET /api/customers
router.get("/", listCustomers);

// GET /api/clientes/cuenta-corriente/deudores
router.get("/cuenta-corriente/deudores", listCustomersWithDebt);

// GET /api/clientes/:id/saldo
router.get("/:id/saldo", getCustomerBalance);

// POST /api/clientes/:id/pagos
router.post("/:id/pagos", createCustomerPayment);

// GET /api/clientes/:id/movimientos
router.get("/:id/movimientos", listCustomerMovements);

// POST /api/customers
router.post("/", createCustomer);

// PUT /api/customers/:id
router.put("/:id", updateCustomer);

// DELETE /api/customers/:id
router.delete("/:id", deleteCustomer);

export default router;

