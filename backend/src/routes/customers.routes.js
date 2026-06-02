import { Router } from "express";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../controllers/customers.controller.js";

const router = Router();

// GET /api/customers
router.get("/", listCustomers);

// POST /api/customers
router.post("/", createCustomer);

// PUT /api/customers/:id
router.put("/:id", updateCustomer);

// DELETE /api/customers/:id
router.delete("/:id", deleteCustomer);

export default router;

