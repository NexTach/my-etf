import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { nxdiPrisma?: PrismaClient };

export const prisma = globalForPrisma.nxdiPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

if (process.env.NODE_ENV !== "production") globalForPrisma.nxdiPrisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
