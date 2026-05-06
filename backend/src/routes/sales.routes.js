import { Router } from "express";
import { createSale, listSales } from "../controllers/sales.controller.js";

const router = Router();

router.get("/", listSales);
router.post("/", createSale);

export default router;
