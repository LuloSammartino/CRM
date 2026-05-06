import { Router } from "express";
import { listProducts, createProduct } from "../controllers/products.controller.js";

const router = Router();

// GET /api/products
router.get("/", listProducts);

// POST /api/products
router.post("/", createProduct);

export default router;

