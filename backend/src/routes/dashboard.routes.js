import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0));

    const [totalCustomers, totalProducts, todaySalesAgg] = await Promise.all([
      prisma.cliente.count(),
      prisma.producto.count(),
      prisma.venta.aggregate({
        _sum: { montoTotal: true },
        _count: { _all: true },
        where: {
          fecha: {
            gte: start,
            lt: end
          }
        }
      })
    ]);

    res.json({
      totalCustomers,
      totalProducts,
      lowStockProducts: 0,
      todaySalesCount: todaySalesAgg._count?._all ?? 0,
      todaySalesTotal: todaySalesAgg._sum?.montoTotal ?? 0
    });
  } catch (err) {
    next(err);
  }
});

export default router;
