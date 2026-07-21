import { z } from "zod";
import { prisma } from "../db/prisma.js";

function cleanMovement(row) {
  return {
    id: String(row.id),
    concepto: row.concepto?.trim() ?? "",
    monto: Number(row.monto),
    tipo: row.tipo,
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha)
  };
}

function parsePagination(query) {
  const limit = Number(query.limit);
  const offset = Number(query.offset);

  return {
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0
  };
}

const movementSchema = z.object({
  concepto: z.string().trim().min(1).max(255),
  tipo: z.enum(["entrada", "salida"]),
  monto: z.coerce.number().positive().max(9999999),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
const expenseConceptSchema = z.object({
  nombre: z.string().trim().min(1).max(255)
});

export async function listCashMovements(req, res, next) {
  try {
    const { limit, offset } = parsePagination(req.query);
    const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : null;
    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT id, concepto, monto, tipo, fecha
        FROM movimientos_caja
        WHERE (${date}::date IS NULL OR fecha = ${date}::date)
        ORDER BY fecha DESC, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM movimientos_caja
        WHERE (${date}::date IS NULL OR fecha = ${date}::date)
      `
    ]);

    res.json({
      rows: rows.map(cleanMovement),
      total: Number(totalRows[0]?.total ?? 0),
      limit,
      offset
    });
  } catch (err) {
    next(err);
  }
}

export async function listExpenseConcepts(_req, res, next) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT nombre
      FROM conceptos_gasto
      ORDER BY nombre ASC
    `;

    res.json(rows.map((row) => row.nombre));
  } catch (err) {
    next(err);
  }
}

export async function createExpenseConcept(req, res, next) {
  try {
    const input = expenseConceptSchema.parse(req.body);
    const [row] = await prisma.$queryRaw`
      INSERT INTO conceptos_gasto (nombre)
      VALUES (${input.nombre})
      ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING nombre
    `;

    res.status(201).json(row.nombre);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function deleteExpenseConcept(req, res, next) {
  try {
    const input = expenseConceptSchema.parse({ nombre: req.params.nombre });
    const rows = await prisma.$queryRaw`
      DELETE FROM conceptos_gasto
      WHERE nombre = ${input.nombre}
      RETURNING nombre
    `;

    if (rows.length === 0) return res.status(404).json({ message: "Concepto no encontrado" });
    res.status(204).end();
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function createCashMovement(req, res, next) {
  try {
    const input = movementSchema.parse(req.body);
    const [row] = await prisma.$queryRaw`
      INSERT INTO movimientos_caja (concepto, monto, tipo, fecha)
      VALUES (${input.concepto}, ${input.monto}, ${input.tipo}, COALESCE(${input.fecha ?? null}::date, CURRENT_DATE))
      RETURNING id, concepto, monto, tipo, fecha
    `;

    res.status(201).json(cleanMovement(row));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function updateCashMovement(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Movimiento invalido" });

    const input = movementSchema.parse(req.body);
    const [row] = await prisma.$queryRaw`
      UPDATE movimientos_caja
      SET concepto = ${input.concepto}, monto = ${input.monto}, tipo = ${input.tipo}, fecha = COALESCE(${input.fecha ?? null}::date, fecha)
      WHERE id = ${id}
      RETURNING id, concepto, monto, tipo, fecha
    `;

    if (!row) return res.status(404).json({ message: "Movimiento no encontrado" });
    res.json(cleanMovement(row));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function deleteCashMovement(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Movimiento invalido" });

    const rows = await prisma.$queryRaw`
      DELETE FROM movimientos_caja
      WHERE id = ${id}
      RETURNING id
    `;
    if (rows.length === 0) return res.status(404).json({ message: "Movimiento no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
