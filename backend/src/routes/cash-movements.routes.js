import { Router } from "express";
import { createCashMovement, listCashMovements } from "../controllers/cash-movements.controller.js";

const router = Router();

router.get("/", listCashMovements);
router.post("/", createCashMovement);

export default router;
