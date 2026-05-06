import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router = Router();

// GET /api/dashboard
// Métricas rápidas: total clientes, productos bajo stock, ventas del día.
router.get("/", async (_req, res, next) => {
  try {
    const lowStockThreshold = 5;

    const [totalCustomers, lowStockProducts, todaySalesAgg] = await Promise.all([
      prisma.customer.count(),
      prisma.product.count({ where: { stockQty: { lte: lowStockThreshold } } }),
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: { _all: true },
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    res.json({
      totalCustomers,
      lowStockProducts,
      todaySalesCount: todaySalesAgg._count?._all ?? 0,
      todaySalesTotal: todaySalesAgg._sum?.total ?? 0
    });
  } catch (err) {
    next(err);
  }
});

export default router;

