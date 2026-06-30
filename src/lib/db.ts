import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires a driver adapter. We use better-sqlite3 against the local
// SQLite file pointed to by DATABASE_URL (e.g. file:./data/app.db).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl! });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot-reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
