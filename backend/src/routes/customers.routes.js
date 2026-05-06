import { Router } from "express";
import { listCustomers, createCustomer } from "../controllers/customers.controller.js";

const router = Router();

// GET /api/customers
router.get("/", listCustomers);

// POST /api/customers
router.post("/", createCustomer);

export default router;

