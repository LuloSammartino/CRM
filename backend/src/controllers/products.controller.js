import { z } from "zod";
import { prisma } from "../db/prisma.js";

export async function listProducts(_req, res, next) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  stockQty: z.union([z.number(), z.string()]).optional().transform((v) => (v === undefined ? 0 : Number(v)))
});

export async function createProduct(req, res, next) {
  try {
    const input = createProductSchema.parse(req.body);
    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      return res.status(400).json({ error: "ValidationError", details: [{ path: ["unitPrice"], message: "unitPrice inválido" }] });
    }
    if (!Number.isInteger(input.stockQty) || input.stockQty < 0) {
      return res.status(400).json({ error: "ValidationError", details: [{ path: ["stockQty"], message: "stockQty inválido" }] });
    }

    // Prisma espera Decimal; pasando number funciona y Prisma lo normaliza.
    const product = await prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unitPrice: input.unitPrice,
        stockQty: input.stockQty
      }
    });

    res.status(201).json(product);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

