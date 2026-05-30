import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * PrismaClient singleton para evitar demasiadas conexiones en dev.
 * 
 * Dónde va la lógica de conexión:
 * - Prisma usa `DATABASE_URL` desde `.env` automáticamente.
 * - Aquí centralizamos el cliente para importarlo en controladores/servicios.
 *
 * Debug:
 * - Si quieres ver queries: new PrismaClient({ log: ["query", "error", "warn"] })
 */
const globalForPrisma = globalThis;
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

