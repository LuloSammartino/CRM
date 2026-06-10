import { prisma } from "./src/db/prisma.js";
import "dotenv/config";

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definida en .env");
  }

  console.log("Intentando conectar a Supabase...");

  const [result] = await prisma.$queryRaw`
    SELECT NOW() AS hora_actual, current_database()::text AS base_actual
  `;

  console.log("Conexion exitosa a Supabase.");
  console.log("Base:", result.base_actual);
  console.log("Hora del servidor DB:", result.hora_actual);
} catch (error) {
  console.error("Error conectando a la base de datos:");
  console.error("Nombre:", error.name);
  if (error.code) console.error("Codigo:", error.code);
  console.error("Mensaje:", error.message);
  if (error.cause) console.error("Causa:", error.cause);
  if (error.stack) console.error(error.stack);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
