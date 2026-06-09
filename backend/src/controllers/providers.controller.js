import { z } from "zod";
import { prisma } from "../db/prisma.js";

function cleanProvider(provider) {
  return {
    id: String(provider.id),
    nombre: provider.nombre?.trim() ?? "",
    direccion: provider.direccion?.trim() || null,
    telefono: provider.telefono?.trim() || null,
    email: provider.email?.trim() || null,
    cuit: provider.cuit?.trim() || null,
    aclaracion: provider.aclaracion?.trim() || null
  };
}

function providerNameQuery(query) {
  const nombre = typeof query.nombre === "string" ? query.nombre.trim() : "";
  const q = typeof query.q === "string" ? query.q.trim() : "";
  return nombre || q;
}

function parsePagination(query) {
  const limit = Number(query.limit);
  const offset = Number(query.offset);

  if (!Number.isInteger(limit) || limit <= 0) return null;

  return {
    limit: Math.min(limit, 100),
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0
  };
}

function parseProviderId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

const providerSchema = z.object({
  nombre: z.string().min(1).max(100),
  direccion: z.string().max(150).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  email: z.string().email().max(50).optional().or(z.literal("").transform(() => undefined)).nullable(),
  cuit: z.string().max(11).optional().nullable(),
  aclaracion: z.string().max(50).optional().nullable()
});

const updateProviderSchema = providerSchema.partial();

function providerData(input) {
  return {
    ...(input.nombre !== undefined ? { nombre: input.nombre.trim() } : {}),
    ...(input.direccion !== undefined ? { direccion: emptyToNull(input.direccion) } : {}),
    ...(input.telefono !== undefined ? { telefono: emptyToNull(input.telefono) } : {}),
    ...(input.email !== undefined ? { email: emptyToNull(input.email) } : {}),
    ...(input.cuit !== undefined ? { cuit: emptyToNull(input.cuit) } : {}),
    ...(input.aclaracion !== undefined ? { aclaracion: emptyToNull(input.aclaracion) } : {})
  };
}

export async function listProviders(req, res, next) {
  try {
    const search = providerNameQuery(req.query);
    const pagination = parsePagination(req.query);
    const where = search
      ? {
          nombre: {
            contains: search,
            mode: "insensitive"
          }
        }
      : {};

    if (pagination) {
      const [providers, total] = await Promise.all([
        prisma.proveedor.findMany({
          where,
          orderBy: { nombre: "asc" },
          skip: pagination.offset,
          take: pagination.limit
        }),
        prisma.proveedor.count({ where })
      ]);

      return res.json({
        rows: providers.map(cleanProvider),
        total,
        limit: pagination.limit,
        offset: pagination.offset
      });
    }

    const providers = await prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" }
    });

    res.json(providers.map(cleanProvider));
  } catch (err) {
    next(err);
  }
}

export async function createProvider(req, res, next) {
  try {
    const input = providerSchema.parse(req.body);

    const provider = await prisma.proveedor.create({
      data: providerData(input)
    });

    res.status(201).json(cleanProvider(provider));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Proveedor duplicado." });
    }
    next(err);
  }
}

export async function updateProvider(req, res, next) {
  try {
    const id = parseProviderId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de proveedor invalido" });
    }

    const input = updateProviderSchema.parse(req.body);
    const provider = await prisma.proveedor.update({
      where: { id },
      data: providerData(input)
    });

    res.json(cleanProvider(provider));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Proveedor no encontrado" });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Proveedor duplicado." });
    }
    next(err);
  }
}

export async function deleteProvider(req, res, next) {
  try {
    const id = parseProviderId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de proveedor invalido" });
    }

    await prisma.proveedor.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Proveedor no encontrado" });
    }
    next(err);
  }
}

export async function searchProvidersByName(req, res, next) {
  try {
    const search = providerNameQuery(req.query);

    if (!search) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Debe indicar un nombre para buscar"
      });
    }

    const providers = await prisma.proveedor.findMany({
      where: {
        nombre: {
          contains: search,
          mode: "insensitive"
        }
      },
      orderBy: { nombre: "asc" }
    });

    res.json(providers.map(cleanProvider));
  } catch (err) {
    next(err);
  }
}
