import { z } from "zod";
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

export async function listProducts(req, res, next) {
  try {
    const nombre = typeof req.query.nombre === "string" ? req.query.nombre.trim() : "";
    const rubro = typeof req.query.rubro === "string" ? req.query.rubro.trim() : "";
    const ordenPrecio = typeof req.query.ordenPrecio === "string" ? req.query.ordenPrecio : "";
    const orderBy = priceOrderBy[ordenPrecio] ?? { nombre: "asc" };

    const products = await prisma.producto.findMany({
      where: {
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
          : {})
      },
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
      distinct: ["rubro"],
      select: { rubro: true },
      where: {
        rubro: {
          not: null
        }
      },
      orderBy: { rubro: "asc" }
    });

    const rubros = [
      ...new Set(rows.map((row) => row.rubro?.trim().toUpperCase()).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, "es"));
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
