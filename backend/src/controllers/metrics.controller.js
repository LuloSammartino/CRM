import { prisma } from "../db/prisma.js";

function dateRange(from, to) {
  const valid = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  };
  if (!valid(from) || !valid(to) || from > to) return null;
  const nextDay = new Date(`${to}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { from, to, toExclusive: nextDay.toISOString().slice(0, 10) };
}

export async function getBusinessMetrics(req, res, next) {
  try {
    const range = dateRange(req.query.from, req.query.to);
    if (!range) return res.status(400).json({ message: "Rango de fechas invalido" });
    const [salesRows, collectedSalesRows, salesByCustomerRows, expenseRows, conceptRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT COALESCE(SUM(monto_total), 0)::float AS total, COUNT(*)::int AS count
        FROM ventas
        WHERE fecha >= ${range.from}::date AND fecha < ${range.toExclusive}::date
      `,
      prisma.$queryRaw`
        SELECT (
          COALESCE((
            SELECT SUM(monto_total)
            FROM ventas
            WHERE LOWER(TRIM(metodo_pago)) <> 'cuenta corriente'
              AND fecha >= ${range.from}::date AND fecha < ${range.toExclusive}::date
          ), 0) +
          COALESCE((
            SELECT SUM(monto)
            FROM movimientos_ctacte
            WHERE tipo = 'PAGO'
              AND fecha >= ${range.from}::date AND fecha < ${range.toExclusive}::date
          ), 0)
        )::float AS total
      `,
      prisma.$queryRaw`
        SELECT COALESCE(NULLIF(TRIM(c.nombre), ''), 'Consumidor Final') AS cliente,
                COALESCE(SUM(v.monto_total), 0)::float AS total,
                COUNT(*)::int AS count,
                JSON_AGG(
                JSON_BUILD_OBJECT('fecha', v.fecha, 'monto', v.monto_total::float)
                ORDER BY v.fecha DESC, v.id DESC
                ) AS movements
        FROM ventas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.fecha >= ${range.from}::date AND v.fecha < ${range.toExclusive}::date
        GROUP BY c.id, c.nombre
        ORDER BY total DESC
      `,
      prisma.$queryRaw`
        SELECT COALESCE(SUM(monto), 0)::float AS total, COUNT(*)::int AS count
        FROM movimientos_caja
        WHERE tipo = 'salida' AND fecha >= ${range.from}::date AND fecha < ${range.toExclusive}::date
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
        WHERE tipo = 'salida' AND fecha >= ${range.from}::date AND fecha < ${range.toExclusive}::date
        GROUP BY 1
        ORDER BY total DESC
      `
    ]);

    const salesTotal = Number(salesRows[0]?.total ?? 0);
    const collectedSalesTotal = Number(collectedSalesRows[0]?.total ?? 0);
    const expensesTotal = Number(expenseRows[0]?.total ?? 0);

    res.json({
      from: range.from,
      to: range.to,
      sales: {
        total: salesTotal,
        count: Number(salesRows[0]?.count ?? 0),
        byCustomer: salesByCustomerRows.map((row) => ({
          cliente: row.cliente,
          total: Number(row.total),
          count: Number(row.count),
          movements: (row.movements ?? []).map((movement) => ({
            fecha: movement.fecha instanceof Date ? movement.fecha.toISOString().slice(0, 10) : String(movement.fecha).slice(0, 10),
            monto: Number(movement.monto)
          }))
        }))
      },
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
      balance: collectedSalesTotal - expensesTotal
    });
  } catch (err) {
    next(err);
  }
}
