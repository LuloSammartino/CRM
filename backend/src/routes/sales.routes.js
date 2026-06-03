import { Router } from "express";
import { createSale, deleteSale, findSalesByProduct, listSales } from "../controllers/sales.controller.js";

const router = Router();

router.get("/", listSales);
router.get("/product/:productId", findSalesByProduct);
router.get("/producto/:productId", findSalesByProduct);
router.post("/", createSale);
router.delete("/:id", deleteSale);

export default router;
