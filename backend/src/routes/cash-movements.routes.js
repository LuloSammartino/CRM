import { Router } from "express";
import { createCashMovement, createExpenseConcept, listCashMovements, listExpenseConcepts } from "../controllers/cash-movements.controller.js";

const router = Router();

router.get("/conceptos", listExpenseConcepts);
router.post("/conceptos", createExpenseConcept);
router.get("/", listCashMovements);
router.post("/", createCashMovement);

export default router;
