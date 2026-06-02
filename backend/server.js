import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import customersRouter from "./src/routes/customers.routes.js";
import productsRouter from "./src/routes/products.routes.js";
import dashboardRouter from "./src/routes/dashboard.routes.js";
import salesRouter from "./src/routes/sales.routes.js";

dotenv.config();

const app = express();

// Middlewares base
app.set("etag", false);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// API routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/customers", customersRouter);
app.use("/api/clients", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);

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

