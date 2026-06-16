import { z } from "zod";
import { prisma } from "../db/prisma.js";

function cleanCustomer(customer) {
  return {
    id: String(customer.id),
    name: customer.nombre?.trim() ?? "",
    email: customer.email?.trim() || null,
    phone: customer.telefono?.trim() || null,
    direccion: customer.direccion?.trim() || null,
    direccion1: customer.direccion1?.trim() || null,
    direccion2: customer.direccion2?.trim() || null,
    cuit: customer.cuit?.trim() || null,
    iva: customer.iva?.trim() || null,
    tipo: customer.tipo?.trim() || null,
    razonSocial: customer.razonSocial?.trim() || null,
    createdAt: ""
  };
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

export async function listCustomers(req, res, next) {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    const iva = typeof req.query.iva === "string" ? req.query.iva.trim() : "";
    const pagination = parsePagination(req.query);
    const andFilters = [];

    if (query) {
      andFilters.push({ nombre: { contains: query, mode: "insensitive" } });
    }

    if (phone) {
      andFilters.push({ telefono: { contains: phone, mode: "insensitive" } });
    }

    if (iva) {
      andFilters.push({ iva: { contains: iva, mode: "insensitive" } });
    }

    const where = andFilters.length ? { AND: andFilters } : {};

    if (pagination) {
      const [customers, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          orderBy: { nombre: "asc" },
          skip: pagination.offset,
          take: pagination.limit
        }),
        prisma.cliente.count({ where })
      ]);

      return res.json({
        rows: customers.map(cleanCustomer),
        total,
        limit: pagination.limit,
        offset: pagination.offset
      });
    }

    const customers = await prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" }
    });
    res.json(customers.map(cleanCustomer));
  } catch (err) {
    next(err);
  }
}

export async function getCustomerBalance(req, res, next) {
  try {
    const id = parseCustomerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de cliente invalido" });
    }

    const [row] = await prisma.$queryRaw`
      SELECT COALESCE(
        SUM(
          CASE
            WHEN tipo = 'DEUDA' THEN monto
            WHEN tipo = 'PAGO' THEN -monto
            ELSE 0
          END
        ),
        0
      ) AS saldo
      FROM movimientos_ctacte
      WHERE cliente_id = ${id}
    `;

    res.json({ saldo: Number(row?.saldo ?? 0) });
  } catch (err) {
    next(err);
  }
}

export async function listCustomersWithDebt(_req, res, next) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.cuit,
        m.venta_id,
        MIN(m.fecha) AS fecha_deuda,
        COALESCE(
          SUM(
            CASE
              WHEN m.tipo = 'DEUDA' THEN m.monto
              WHEN m.tipo = 'PAGO' THEN -m.monto
              ELSE 0
            END
          ),
          0
        ) AS saldo
      FROM movimientos_ctacte m
      INNER JOIN clientes c ON c.id = m.cliente_id
      WHERE m.venta_id IS NOT NULL
      GROUP BY c.id, c.nombre, c.telefono, c.cuit, m.venta_id
      HAVING COALESCE(
        SUM(
          CASE
            WHEN m.tipo = 'DEUDA' THEN m.monto
            WHEN m.tipo = 'PAGO' THEN -m.monto
            ELSE 0
          END
        ),
        0
      ) > 0
      ORDER BY fecha_deuda DESC, c.nombre ASC
    `;

    res.json(
      rows.map((row) => ({
        id: String(row.id),
        name: row.nombre?.trim() ?? "",
        phone: row.telefono?.trim() || null,
        cuit: row.cuit?.trim() || null,
        ventaId: row.venta_id == null ? null : String(row.venta_id),
        fecha: row.fecha_deuda,
        saldo: Number(row.saldo)
      }))
    );
  } catch (err) {
    next(err);
  }
}

const customerPaymentSchema = z.object({
  monto: z.number().positive(),
  detalle: z.string().min(1),
  ventaId: z.coerce.number().int().positive().optional()
});

export async function createCustomerPayment(req, res, next) {
  try {
    const id = parseCustomerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de cliente invalido" });
    }

    const input = customerPaymentSchema.parse(req.body);
    const currentDebt = input.ventaId
      ? await prisma.$queryRaw`
          SELECT COALESCE(
            SUM(
              CASE
                WHEN tipo = 'DEUDA' THEN monto
                WHEN tipo = 'PAGO' THEN -monto
                ELSE 0
              END
            ),
            0
          ) AS saldo
          FROM movimientos_ctacte
          WHERE cliente_id = ${id} AND venta_id = ${input.ventaId}
        `
      : null;

    const debtBalance = Number(currentDebt?.[0]?.saldo ?? 0);
    if (input.ventaId && debtBalance <= 0) {
      return res.status(404).json({ error: "NotFound", message: "Deuda no encontrada" });
    }
    if (input.ventaId && input.monto > debtBalance) {
      return res.status(400).json({ error: "ValidationError", message: "El pago no puede superar la deuda." });
    }

    const [movement] = await prisma.$queryRaw`
      INSERT INTO movimientos_ctacte (cliente_id, venta_id, tipo, monto, detalle, fecha)
      VALUES (${id}, ${input.ventaId ?? null}, 'PAGO', ${input.monto}, ${input.detalle}, CURRENT_TIMESTAMP)
      RETURNING id, cliente_id, venta_id, tipo, monto, detalle, fecha
    `;

    res.status(201).json({
      ok: true,
      message: "Pago registrado correctamente",
      movimiento: {
        id: movement.id,
        cliente_id: movement.cliente_id,
        venta_id: movement.venta_id,
        tipo: movement.tipo,
        monto: Number(movement.monto),
        detalle: movement.detalle,
        fecha: movement.fecha
      }
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

export async function listCustomerMovements(req, res, next) {
  try {
    const id = parseCustomerId(req.params.id);
    const ventaId = parseCustomerId(req.query.ventaId);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de cliente invalido" });
    }

    const movements = await prisma.$queryRaw`
      SELECT id, cliente_id, venta_id, tipo, monto, detalle, fecha
      FROM movimientos_ctacte
      WHERE cliente_id = ${id}
        AND (${ventaId}::int IS NULL OR venta_id = ${ventaId})
      ORDER BY fecha DESC
    `;

    res.json(
      movements.map((movement) => ({
        ...movement,
        monto: Number(movement.monto)
      }))
    );
  } catch (err) {
    next(err);
  }
}

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional(),
  direccion: z.string().optional().nullable(),
  direccion1: z.string().optional().nullable(),
  direccion2: z.string().optional().nullable(),
  cuit: z.string().optional().nullable(),
  iva: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable()
});

const updateCustomerSchema = customerSchema.partial();

function parseCustomerId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function customerData(input) {
  return {
    ...(input.name !== undefined ? { nombre: input.name } : {}),
    ...(input.email !== undefined ? { email: emptyToNull(input.email) } : {}),
    ...(input.phone !== undefined ? { telefono: emptyToNull(input.phone) } : {}),
    ...(input.direccion !== undefined ? { direccion: emptyToNull(input.direccion) } : {}),
    ...(input.direccion1 !== undefined ? { direccion1: emptyToNull(input.direccion1) } : {}),
    ...(input.direccion2 !== undefined ? { direccion2: emptyToNull(input.direccion2) } : {}),
    ...(input.cuit !== undefined ? { cuit: emptyToNull(input.cuit) } : {}),
    ...(input.iva !== undefined ? { iva: emptyToNull(input.iva) } : {}),
    ...(input.tipo !== undefined ? { tipo: emptyToNull(input.tipo) } : {}),
    ...(input.razonSocial !== undefined ? { razonSocial: emptyToNull(input.razonSocial) } : {})
  };
}

export async function createCustomer(req, res, next) {
  try {
    const input = customerSchema.parse(req.body);

    const customer = await prisma.cliente.create({
      data: customerData(input)
    });

    res.status(201).json(cleanCustomer(customer));
  } catch (err) {
    // Zod -> 400
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Cliente duplicado." });
    }
    next(err);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const id = parseCustomerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de cliente invalido" });
    }

    const input = updateCustomerSchema.parse(req.body);
    const customer = await prisma.cliente.update({
      where: { id },
      data: customerData(input)
    });

    res.json(cleanCustomer(customer));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Cliente no encontrado" });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Conflict", message: "Cliente duplicado." });
    }
    next(err);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const id = parseCustomerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de cliente invalido" });
    }

    await prisma.cliente.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Cliente no encontrado" });
    }
    next(err);
  }
}
