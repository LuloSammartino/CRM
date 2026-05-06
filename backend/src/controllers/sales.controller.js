import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export async function listSales(_req, res, next) {
  try {
    const rows = await prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });
    const data = rows.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      customerId: s.customerId,
      customerName: s.customer.name,
      total: Number(s.total),
      lines: s.items.map((it) => ({
        productName: it.product.name,
        sku: it.product.sku,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal)
      }))
    }));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

const newCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional(),
  address: z.string().optional()
});

const saleItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative()
});

const createSaleSchema = z
  .object({
    // Fecha de venta (YYYY-MM-DD desde el input date del navegador).
    soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    customerId: z.string().min(1).optional(),
    newCustomer: newCustomerSchema.optional(),
    items: z.array(saleItemSchema).min(1)
  })
  .superRefine((data, ctx) => {
    const hasId = Boolean(data.customerId);
    const hasNew = Boolean(data.newCustomer);
    if (hasId === hasNew) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes enviar customerId o newCustomer, no ambos ni ninguno."
      });
    }
  });

function parseSoldAtUtcNoon(isoDateOnly) {
  const [y, mo, d] = isoDateOnly.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

export async function createSale(req, res, next) {
  try {
    const input = createSaleSchema.parse(req.body);
    const soldAt = parseSoldAtUtcNoon(input.soldAt);

    const result = await prisma.$transaction(async (tx) => {
      let customerId = input.customerId;
      if (input.newCustomer) {
        const c = await tx.customer.create({
          data: {
            name: input.newCustomer.name,
            email: input.newCustomer.email,
            phone: input.newCustomer.phone,
            address: input.newCustomer.address
          }
        });
        customerId = c.id;
      }

      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        const found = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !found.has(id));
        const err = new Error(`PRODUCT_NOT_FOUND:${missing.join(",")}`);
        err.code = "PRODUCT_NOT_FOUND";
        throw err;
      }

      const byId = new Map(products.map((p) => [p.id, p]));
      for (const line of input.items) {
        const p = byId.get(line.productId);
        if (p.stockQty < line.qty) {
          const err = new Error(`STOCK_INSUFFICIENT:${p.id}`);
          err.code = "STOCK_INSUFFICIENT";
          throw err;
        }
      }

      let total = new Prisma.Decimal(0);
      for (const line of input.items) {
        const lineTotal = new Prisma.Decimal(line.unitPrice).mul(line.qty);
        total = total.add(lineTotal);
      }

      const sale = await tx.sale.create({
        data: {
          customerId,
          createdAt: soldAt,
          total,
          items: {
            create: input.items.map((line) => ({
              productId: line.productId,
              qty: line.qty,
              unitPrice: new Prisma.Decimal(line.unitPrice),
              lineTotal: new Prisma.Decimal(line.unitPrice).mul(line.qty)
            }))
          }
        },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });

      for (const line of input.items) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQty: { decrement: line.qty } }
        });
      }

      return sale;
    });

    res.status(201).json(result);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Email de cliente duplicado." });
    }
    if (err?.code === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({ error: "ProductNotFound", message: err.message });
    }
    if (err?.code === "STOCK_INSUFFICIENT") {
      return res.status(400).json({ error: "StockInsufficient", message: err.message });
    }
    next(err);
  }
}
