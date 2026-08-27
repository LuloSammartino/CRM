import { Router } from "express";
import { createSale, deleteSale, findSalesByProduct, getSale, listSales, updateSale } from "../controllers/sales.controller.js";

const router = Router();

router.get("/", listSales);
router.get("/product/:productId", findSalesByProduct);
router.get("/producto/:productId", findSalesByProduct);
router.get("/:id", getSale);
router.post("/", createSale);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);

export default router;
