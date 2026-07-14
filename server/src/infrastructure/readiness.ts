import { prisma } from "./prisma.js";

export async function checkDatabaseReadiness() {
  // This canonical-table probe catches both connectivity failures and an incomplete tb_* cutover.
  await prisma.$queryRaw`SELECT 1 FROM tb_portfolio_holdings LIMIT 1`;
}
