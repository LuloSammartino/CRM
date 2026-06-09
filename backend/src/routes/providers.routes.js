import { Router } from "express";
import {
  createProvider,
  deleteProvider,
  listProviders,
  searchProvidersByName,
  updateProvider
} from "../controllers/providers.controller.js";

const router = Router();

// GET /api/proveedores
router.get("/", listProviders);

// GET /api/proveedores/buscar?nombre=
router.get("/buscar", searchProvidersByName);

// POST /api/proveedores
router.post("/", createProvider);

// PUT /api/proveedores/:id
router.put("/:id", updateProvider);

// DELETE /api/proveedores/:id
router.delete("/:id", deleteProvider);

export default router;
