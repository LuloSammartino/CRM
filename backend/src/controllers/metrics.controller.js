import { prisma } from "../db/prisma.js";

function monthRange(value) {
  const text = typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7);
  const [year, month] = text.split("-").map(Number);
  if (month < 1 || month > 12) return monthRange();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(Date.UTC(year, month, 1));
  const to = `${toDate.getUTCFullYear()}-${String(toDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { month: text, from, to };
}

export async function getBusinessMetrics(req, res, next) {
  try {
    const range = monthRange(req.query.month);
    const [salesRows, expenseRows, conceptRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT COALESCE(SUM(monto_total), 0)::float AS total, COUNT(*)::int AS count
        FROM ventas
        WHERE fecha >= ${range.from}::date AND fecha < ${range.to}::date
      `,
      prisma.$queryRaw`
        SELECT COALESCE(SUM(monto), 0)::float AS total, COUNT(*)::int AS count
        FROM movimientos_caja
        WHERE tipo = 'salida' AND fecha >= ${range.from}::date AND fecha < ${range.to}::date
      `,
      prisma.$queryRaw`
        SELECT COALESCE(NULLIF(TRIM(concepto), ''), 'Sin concepto') AS concepto,
               COALESCE(SUM(monto), 0)::float AS total,
               COUNT(*)::int AS count,
               JSON_AGG(
                 JSON_BUILD_OBJECT('fecha', fecha, 'monto', monto::float)
                 ORDER BY fecha DESC, id DESC
               ) AS movements
        FROM movimientos_caja
        WHERE tipo = 'salida' AND fecha >= ${range.from}::date AND fecha < ${range.to}::date
        GROUP BY 1
        ORDER BY total DESC
      `
    ]);

    const salesTotal = Number(salesRows[0]?.total ?? 0);
    const expensesTotal = Number(expenseRows[0]?.total ?? 0);

    res.json({
      month: range.month,
      sales: { total: salesTotal, count: Number(salesRows[0]?.count ?? 0) },
      expenses: {
        total: expensesTotal,
        count: Number(expenseRows[0]?.count ?? 0),
        byConcept: conceptRows.map((row) => ({
          concepto: row.concepto,
          total: Number(row.total),
          count: Number(row.count),
          movements: (row.movements ?? []).map((movement) => ({
            fecha: movement.fecha instanceof Date ? movement.fecha.toISOString().slice(0, 10) : String(movement.fecha).slice(0, 10),
            monto: Number(movement.monto)
          }))
        }))
      },
      balance: salesTotal - expensesTotal
    });
  } catch (err) {
    next(err);
  }
}
