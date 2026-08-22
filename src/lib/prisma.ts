import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db"
  const isTursoEnabled = process.env.USE_TURSO === "true" && (databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://"))
  let adapter: any

  if (isTursoEnabled) {
    // Turso Serverless Cloud Database
    adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
  } else {
    // Fast Local SQLite Embedded DB (<15ms response time)
    adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" })
  }

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma