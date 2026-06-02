import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProductProveedores,
  listProductRubros,
  listProducts,
  updateProduct
} from "../controllers/products.controller.js";

const router = Router();

// GET /api/products
router.get("/", listProducts);

// GET /api/products/rubros
router.get("/rubros", listProductRubros);

// GET /api/products/proveedores
router.get("/proveedores", listProductProveedores);

// GET /api/products/:id
router.get("/:id", getProductById);

// POST /api/products
router.post("/", createProduct);

// PUT /api/products/:id
router.put("/:id", updateProduct);

// DELETE /api/products/:id
router.delete("/:id", deleteProduct);

export default router;

