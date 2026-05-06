import { z } from "zod";
import { prisma } from "../db/prisma.js";

export async function listCustomers(_req, res, next) {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sales: {
          select: { id: true, total: true, createdAt: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
}

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional(),
  address: z.string().optional()
});

export async function createCustomer(req, res, next) {
  try {
    const input = createCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address
      }
    });

    res.status(201).json(customer);
  } catch (err) {
    // Zod -> 400
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "ValidationError", details: err.errors });
    }
    next(err);
  }
}

