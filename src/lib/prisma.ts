import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db"
  let adapter: any

  // 1. Turso / LibSQL (Serverless edge database for 24/7 free cloud deployment)
  if (databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://")) {
    adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
  } else {
    // 2. Local SQLite / Embedded file DB
    adapter = new PrismaBetterSqlite3({ url: databaseUrl })
  }

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma