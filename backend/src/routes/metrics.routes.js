import { Router } from "express";
import { getBusinessMetrics } from "../controllers/metrics.controller.js";

const router = Router();

router.get("/", getBusinessMetrics);

export default router;
