import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { createClient } from "@libsql/client"

const DEFAULT_TURSO_URL = "libsql://utopi-jimmyyehia.aws-ap-northeast-1.turso.io"
const DEFAULT_TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYzMDk3MTEsImlkIjoiMDE5ZmU4NTktNTEwMS03ODRlLTkyZmEtZGExODM3YjM5NjRhIiwia2lkIjoiMW9QdEZtbUI3X3pKM0RMQjhzSTdPVUVaRHFRMDNocjlKZ1JJMDk4ZVpUMCIsInJpZCI6IjEyNzczYmNhLTdkYWYtNGM3Zi1hOTJhLWVkNGY3NTM5ZDkyYiJ9.Bcl4AZ2GJOoAjPtUnmJkGLlCqXe29uATyWfcZR24lRPc26dBqhoqxb7GRhKLwN8FVjdrmAnDdIRZMu78SNQ7Bg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: any | undefined
}

function createPrismaClient() {
  const envDbUrl = process.env.DATABASE_URL?.trim()
  const envAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim()

  // In production (Vercel) or when DATABASE_URL is set to Turso, connect to Turso Cloud DB
  const isProduction = process.env.NODE_ENV === "production"
  const isTursoUrl =
    (envDbUrl && (envDbUrl.startsWith("libsql://") || envDbUrl.startsWith("https://"))) ||
    isProduction

  let adapter: any

  if (isTursoUrl) {
    const targetUrl = envDbUrl && envDbUrl.startsWith("libsql") ? envDbUrl : DEFAULT_TURSO_URL
    const targetToken = envAuthToken || DEFAULT_TURSO_TOKEN

    // Connection pooling for serverless functions
    const libsqlClient =
      globalForPrisma.libsqlClient ??
      createClient({
        url: targetUrl,
        authToken: targetToken,
      })
    globalForPrisma.libsqlClient = libsqlClient

    adapter = new PrismaLibSql(libsqlClient)
  } else {
    // Local SQLite for dev mode
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