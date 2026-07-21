import { Router } from "express";
import {
  createCashMovement,
  createExpenseConcept,
  deleteCashMovement,
  deleteExpenseConcept,
  listCashMovements,
  listExpenseConcepts,
  updateCashMovement
} from "../controllers/cash-movements.controller.js";

const router = Router();

router.get("/conceptos", listExpenseConcepts);
router.post("/conceptos", createExpenseConcept);
router.delete("/conceptos/:nombre", deleteExpenseConcept);
router.get("/", listCashMovements);
router.post("/", createCashMovement);
router.put("/:id", updateCashMovement);
router.delete("/:id", deleteCashMovement);

export default router;
