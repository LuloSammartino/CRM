import { Router } from "express";
import {
  createCashMovement,
  createExpenseConcept,
  deleteCashMovement,
  listCashMovements,
  listExpenseConcepts,
  updateCashMovement
} from "../controllers/cash-movements.controller.js";

const router = Router();

router.get("/conceptos", listExpenseConcepts);
router.post("/conceptos", createExpenseConcept);
router.get("/", listCashMovements);
router.post("/", createCashMovement);
router.put("/:id", updateCashMovement);
router.delete("/:id", deleteCashMovement);

export default router;
