import { PrismaClient } from "@prisma/client";

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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

