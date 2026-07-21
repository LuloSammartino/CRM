import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import customersRouter from "./src/routes/customers.routes.js";
import productsRouter from "./src/routes/products.routes.js";
import salesRouter from "./src/routes/sales.routes.js";
import providersRouter from "./src/routes/providers.routes.js";
import cashMovementsRouter from "./src/routes/cash-movements.routes.js";
import metricsRouter from "./src/routes/metrics.routes.js";
import { changePassword, login, logout, me, requireAuth } from "./src/auth.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}

const app = express();
const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");
const clientOrigins = new Set(
  String(process.env.CLIENT_ORIGINS ?? process.env.CLIENT_ORIGIN ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean)
);

// Middlewares base
app.set("etag", false);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || clientOrigins.has(normalizeOrigin(origin))) return callback(null, true);
    callback(null, false);
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// API routes
app.post("/api/auth/login", login);
app.use("/api", requireAuth);
app.get("/api/auth/me", me);
app.post("/api/auth/logout", logout);
app.post("/api/auth/change-password", changePassword);
app.use("/api/customers", customersRouter);
app.use("/api/clients", customersRouter);
app.use("/api/clientes", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/proveedores", providersRouter);
app.use("/api/sales", salesRouter);
app.use("/api/movimientos-caja", cashMovementsRouter);
app.use("/api/metricas", metricsRouter);

// Error handler simple (centralizado)
// Nota: si agregas validaciones/errores custom, normalízalos aquí.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

