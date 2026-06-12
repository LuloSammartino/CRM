import { z } from "zod";
import { prisma } from "../db/prisma.js";

function parsePositiveInt(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePagination(query) {
  const limit = Number(query.limit);
  const offset = Number(query.offset);

  if (!Number.isInteger(limit) || limit <= 0) {
    return { limit: 50, offset: 0 };
  }

  return {
    limit: Math.min(limit, 100),
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0
  };
}

function cleanSearchText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseDateOnly(value) {
  if (!value) return undefined;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const [year, month, day] = text.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatDateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

function formatTimeOnly(value) {
  if (!(value instanceof Date)) return null;
  return value.toISOString().slice(11, 19);
}

function cleanSale(sale) {
  const fecha = formatDateOnly(sale.fecha);
  const hora = formatTimeOnly(sale.hora);

  return {
    id: String(sale.id),
    fecha,
    hora,
    createdAt: fecha ? `${fecha}T${hora ?? "00:00:00"}.000Z` : null,
    clienteId: sale.clienteId == null ? null : String(sale.clienteId),
    customerId: sale.clienteId == null ? null : String(sale.clienteId),
    customerName: sale.cliente?.nombre?.trim() || "Consumidor Final",
    montoTotal: Number(sale.montoTotal),
    total: Number(sale.montoTotal),
    metodoPago: sale.metodoPago,
    lines: (sale.detalles ?? []).map((detail) => ({
      id: String(detail.id),
      productId: String(detail.productoId),
      productName: detail.producto?.nombre?.trim() || "Producto",
      sku: String(detail.productoId),
      qty: detail.cantidad,
      unitPrice: Number(detail.precioUnitario),
      lineTotal: Number(detail.subtotal)
    }))
  };
}

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  productoId: z.coerce.number().int().positive().optional(),
  qty: z.coerce.number().int().positive().optional(),
  cantidad: z.coerce.number().int().positive().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  precioUnitario: z.coerce.number().nonnegative().optional()
});

const createSaleSchema = z.object({
  soldAt: z.string().optional(),
  fecha: z.string().optional(),
  customerId: z.coerce.number().int().positive().optional().nullable(),
  clienteId: z.coerce.number().int().positive().optional().nullable(),
  metodoPago: z.string().trim().min(1).max(50).default("Efectivo"),
  detalle: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().min(1).optional().nullable()
  ),
  items: z.array(saleItemSchema).min(1)
});

function isCurrentAccountPayment(value) {
  return String(value ?? "").trim().toLowerCase() === "cuenta corriente";
}

function normalizeSaleItem(item) {
  const productoId = item.productoId ?? item.productId;
  const cantidad = item.cantidad ?? item.qty;
  const precioUnitario = item.precioUnitario ?? item.unitPrice;

  if (!productoId || !cantidad || precioUnitario == null) {
    return null;
  }

  return {
    productoId,
    cantidad,
    precioUnitario,
    subtotal: cantidad * precioUnitario
  };
}

const saleInclude = {
  cliente: true,
  detalles: {
    include: {
      producto: true
    },
    orderBy: { id: "asc" }
  }
};

export async function listSales(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const productSearch = cleanSearchText(req.query.product ?? req.query.producto);
    const customerSearch = cleanSearchText(req.query.customer ?? req.query.cliente);
    const productIdSearch = Number(productSearch);
    const where = {
      ...(productSearch
        ? {
            detalles: {
              some: {
                producto: {
                  is: {
                    OR: [
                      { nombre: { contains: productSearch, mode: "insensitive" } },
                      ...(Number.isInteger(productIdSearch) && productIdSearch > 0 ? [{ id: productIdSearch }] : [])
                    ]
                  }
                }
              }
            }
          }
        : {}),
      ...(customerSearch
        ? {
            cliente: {
              is: {
                OR: [
                  { nombre: { contains: customerSearch, mode: "insensitive" } },
                  { razonSocial: { contains: customerSearch, mode: "insensitive" } }
                ]
              }
            }
          }
        : {})
    };

    const [sales, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        orderBy: [{ fecha: "desc" }, { hora: "desc" }, { id: "desc" }],
        skip: pagination.offset,
        take: pagination.limit,
        include: saleInclude
      }),
      prisma.venta.count({ where })
    ]);

    res.json({
      rows: sales.map(cleanSale),
      total,
      limit: pagination.limit,
      offset: pagination.offset
    });
  } catch (err) {
    next(err);
  }
}

export async function createSale(req, res, next) {
  try {
    const input = createSaleSchema.parse(req.body);
    const clienteId = input.clienteId ?? input.customerId ?? null;
    const fecha = parseDateOnly(input.fecha ?? input.soldAt);
    const isCuentaCorriente = isCurrentAccountPayment(input.metodoPago);

    if (fecha === null) {
      return res.status(400).json({ error: "ValidationError", message: "fecha invalida. Usa YYYY-MM-DD." });
    }

    if (isCuentaCorriente && !clienteId) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Las ventas en cuenta corriente requieren un cliente."
      });
    }

    const items = input.items.map(normalizeSaleItem);
    if (items.some((item) => item == null)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Cada item debe tener productoId/productId, cantidad/qty y precioUnitario/unitPrice."
      });
    }

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const productIds = [...new Set(items.map((item) => item.productoId))];

    const sale = await prisma.$transaction(async (tx) => {
      if (clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
        if (!cliente) {
          const err = new Error("CLIENT_NOT_FOUND");
          err.code = "CLIENT_NOT_FOUND";
          throw err;
        }
      }

      const products = await tx.producto.findMany({
        where: { id: { in: productIds } },
        select: { id: true }
      });
      if (products.length !== productIds.length) {
        const found = new Set(products.map((product) => product.id));
        const missing = productIds.filter((id) => !found.has(id));
        const err = new Error(`PRODUCT_NOT_FOUND:${missing.join(",")}`);
        err.code = "PRODUCT_NOT_FOUND";
        throw err;
      }

      const sale = await tx.venta.create({
        data: {
          ...(fecha ? { fecha } : {}),
          clienteId,
          montoTotal: total,
          metodoPago: input.metodoPago,
          detalles: {
            create: items.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: item.subtotal
            }))
          }
        },
        include: saleInclude
      });

      if (isCuentaCorriente) {
        await tx.$executeRaw`
          INSERT INTO movimientos_ctacte (cliente_id, venta_id, tipo, monto, detalle, fecha)
          VALUES (${clienteId}, ${sale.id}, 'DEUDA', ${total}, ${input.detalle ?? null}, CURRENT_TIMESTAMP)
        `;
      }

      return sale;
    });

    res.status(201).json(cleanSale(sale));
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    if (err?.code === "CLIENT_NOT_FOUND") {
      return res.status(404).json({ error: "NotFound", message: "Cliente no encontrado" });
    }
    if (err?.code === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ error: "NotFound", message: err.message });
    }
    if (err?.code === "P2003") {
      return res.status(400).json({ error: "ValidationError", message: "Cliente o producto invalido" });
    }
    next(err);
  }
}

export async function findSalesByProduct(req, res, next) {
  try {
    const productId = parsePositiveInt(req.params.productId ?? req.query.productId ?? req.query.productoId);
    if (!productId) {
      return res.status(400).json({ error: "ValidationError", message: "id de producto invalido" });
    }

    const pagination = parsePagination(req.query);
    const where = {
      detalles: {
        some: {
          productoId: productId
        }
      }
    };

    const [sales, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        orderBy: [{ fecha: "desc" }, { hora: "desc" }, { id: "desc" }],
        skip: pagination.offset,
        take: pagination.limit,
        include: saleInclude
      }),
      prisma.venta.count({ where })
    ]);

    res.json({
      rows: sales.map(cleanSale),
      total,
      limit: pagination.limit,
      offset: pagination.offset
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSale(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "id de venta invalido" });
    }

    await prisma.venta.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NotFound", message: "Venta no encontrada" });
    }
    next(err);
  }
}
