import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

function parseProductId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanProduct(product) {
  return {
    ...product,
    nombre: product.nombre?.trim(),
    rubro: product.rubro?.trim() ?? null
  };
}

function rubroDisplayScore(value) {
  const lower = value.toLocaleLowerCase("es");
  const upper = value.toLocaleUpperCase("es");
  const isAllUpper = lower !== upper && value === upper;
  return isAllUpper ? 1 : 0;
}

const productListSelect = {
  id: true,
  nombre: true,
  costo: true,
  precio1: true,
  precio2: true,
  precio3: true,
  rubro: true,
  proveedorId: true
};

const priceOrderBy = {
  precio1_asc: { precio1: "asc" },
  precio1_desc: { precio1: "desc" }
};

function parsePagination(query) {
  const limit = Number(query.limit);
  const offset = Number(query.offset);

  if (!Number.isInteger(limit) || limit <= 0) return null;

  return {
    limit: Math.min(limit, 100),
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0
  };
}

export async function listProducts(req, res, next) {
  try {
    const nombre = typeof req.query.nombre === "string" ? req.query.nombre.trim() : "";
    const rubro = typeof req.query.rubro === "string" ? req.query.rubro.trim() : "";
    const proveedorId = Number(req.query.proveedorId);
    const ordenPrecio = typeof req.query.ordenPrecio === "string" ? req.query.ordenPrecio : "";
    const orderBy = priceOrderBy[ordenPrecio] ?? { nombre: "asc" };
    const pagination = parsePagination(req.query);
    const where = {
      ...(nombre
        ? {
            nombre: {
              contains: nombre,
              mode: "insensitive"
            }
          }
        : {}),
      ...(rubro
        ? {
            rubro: {
              contains: rubro,
              mode: "insensitive"
            }
          }
        : {}),
      ...(Number.isInteger(proveedorId) && proveedorId > 0 ? { proveedorId } : {})
    };

    if (pagination) {
      const [products, total] = await Promise.all([
        prisma.producto.findMany({
          where,
          orderBy,
          skip: pagination.offset,
          take: pagination.limit,
          select: productListSelect
        }),
        prisma.producto.count({ where })
      ]);

      return res.json({
        rows: products.map(cleanProduct),
        total,
        limit: pagination.limit,
        offset: pagination.offset
      });
    }

    const products = await prisma.producto.findMany({
      where,
      orderBy,
      select: productListSelect
    });

    res.json(products.map(cleanProduct));
  } catch (err) {
    next(err);
  }
}

export async function listProductRubros(_req, res, next) {
  try {
    const rows = await prisma.producto.findMany({
      select: { rubro: true },
      where: {
        rubro: {
          not: null
        }
      },
      orderBy: { rubro: "asc" }
    });

    const rubroByKey = new Map();
    rows.forEach((row) => {
      const rubro = row.rubro?.trim();
      if (!rubro) return;

      const key = rubro.toLocaleLowerCase("es");
      const current = rubroByKey.get(key);
      if (!current || rubroDisplayScore(rubro) < rubroDisplayScore(current)) {
        rubroByKey.set(key, rubro);
      }
    });

    const rubros = [...rubroByKey.values()].sort((a, b) => a.localeCompare(b, "es"));
    res.json(rubros);
  } catch (err) {
    next(err);
  }
}

export async function listProductProveedores(_req, res, next) {
  try {
    const rows = await prisma.producto.findMany({
      distinct: ["proveedorId"],
      select: { proveedorId: true },
      where: {
        proveedorId: {
          not: null
        }
      },
      orderBy: { proveedorId: "asc" }
    });

    const proveedores = rows
      .map((row) => (row.proveedorId == null ? null : Number(row.proveedorId)))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    res.json(proveedores);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const id = parseProductId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de producto invalido" });
    }

    const product = await prisma.producto.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ error: "NotFound", message: "Producto no encontrado" });
    }

    res.json(cleanProduct(product));
  } catch (err) {
    next(err);
  }
}

const createProductSchema = z.object({
  nombre: z.string().min(1),
  rubro: z.string().optional().nullable(),
  costo: z.coerce.number().nonnegative().optional().nullable(),
  precio1: z.coerce.number().nonnegative(),
  precio2: z.coerce.number().nonnegative().optional().nullable(),
  precio3: z.coerce.number().nonnegative().optional().nullable(),
  proveedorId: z.coerce.number().int().positive().optional().nullable()
});

const updateProductSchema = createProductSchema.partial();

const bulkUpdateProductSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("rubro"),
    rubro: z.string().min(1),
    percentage: z.coerce.number().min(-100).max(1000)
  }),
  z.object({
    mode: z.literal("proveedor"),
    proveedorId: z.coerce.number().int().positive(),
    percentage: z.coerce.number().min(-100).max(1000)
  })
]);

export async function createProduct(req, res, next) {
  try {
    const input = createProductSchema.parse(req.body);

    const product = await prisma.producto.create({
      data: {
        nombre: input.nombre,
        rubro: input.rubro ?? null,
        costo: input.costo ?? null,
        precio1: input.precio1,
        precio2: input.precio2 ?? null,
        precio3: input.precio3 ?? null,
        creado: new Date(),
        proveedorId: input.proveedorId ?? null
      }
    });

    res.status(201).json(product);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Producto duplicado." });
    }
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const id = parseProductId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de producto invalido" });
    }

    const input = updateProductSchema.parse(req.body);
    const product = await prisma.producto.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
        ...(input.rubro !== undefined ? { rubro: input.rubro } : {}),
        ...(input.costo !== undefined ? { costo: input.costo } : {}),
        ...(input.precio1 !== undefined ? { precio1: input.precio1 } : {}),
        ...(input.precio2 !== undefined ? { precio2: input.precio2 } : {}),
        ...(input.precio3 !== undefined ? { precio3: input.precio3 } : {}),
        ...(input.proveedorId !== undefined ? { proveedorId: input.proveedorId } : {}),
        modificado: new Date()
      }
    });

    res.json(product);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Producto no encontrado" });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Producto duplicado." });
    }
    next(err);
  }
}

export async function bulkUpdateProducts(req, res, next) {
  try {
    const input = bulkUpdateProductSchema.parse(req.body);
    const factor = 1 + input.percentage / 100;
    const where =
      input.mode === "rubro"
        ? Prisma.sql`LOWER(TRIM(rubro)) = LOWER(${input.rubro.trim()})`
        : Prisma.sql`proveedor_id = ${input.proveedorId}`;

    const updated = await prisma.$executeRaw`
      UPDATE producto
      SET
        costo = CASE WHEN costo IS NULL THEN NULL ELSE ROUND((costo * ${factor})::numeric, 2) END,
        precio_1 = ROUND((precio_1 * ${factor})::numeric, 2),
        precio_2 = CASE WHEN precio_2 IS NULL THEN NULL ELSE ROUND((precio_2 * ${factor})::numeric, 2) END,
        precio_3 = CASE WHEN precio_3 IS NULL THEN NULL ELSE ROUND((precio_3 * ${factor})::numeric, 2) END,
        modificado = CURRENT_DATE
      WHERE ${where}
    `;

    res.json({ updated });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const id = parseProductId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de producto invalido" });
    }

    await prisma.producto.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Producto no encontrado" });
    }
    if (err?.code === "P2003") {
      return res.status(409).json({
        error: "Conflict",
        message: "No se puede eliminar el producto porque tiene datos relacionados."
      });
    }
    next(err);
  }
}
