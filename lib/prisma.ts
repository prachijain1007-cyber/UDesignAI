import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

/**
 * Standard deployments (Docker/Railway/Render, or Vercel with a
 * conventional Postgres host) have normal TCP access to Postgres and use
 * PrismaClient directly. Set DATABASE_DRIVER=neon-http to instead route
 * every query over Neon's HTTPS SQL endpoint via @prisma/adapter-neon —
 * useful in network environments that only permit outbound HTTPS (no raw
 * TCP), and it's also Neon/Vercel's own recommended driver for serverless
 * functions to avoid exhausting Postgres connection limits.
 */
function createPrismaClient(): PrismaClient {
  if (process.env.DATABASE_DRIVER === "neon-http") {
    // Lazily required so the @neondatabase/serverless + @prisma/adapter-neon
    // packages never need to load (or even be installed) for the common
    // direct-TCP deployment path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neonConfig } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");

    neonConfig.poolQueryViaFetch = true;
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
