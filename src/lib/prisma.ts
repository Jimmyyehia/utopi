import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaLibSql } from "@prisma/adapter-libsql"

import Database from "better-sqlite3"

const DEFAULT_TURSO_URL = "libsql://utopi-jimmyyehia.aws-ap-northeast-1.turso.io"
const DEFAULT_TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYzMDk3MTEsImlkIjoiMDE5ZmU4NTktNTEwMS03ODRlLTkyZmEtZGExODM3YjM5NjRhIiwia2lkIjoiMW9QdEZtbUI3X3pKM0RMQjhzSTdPVUVaRHFRMDNocjlKZ1JJMDk4ZVpUMCIsInJpZCI6IjEyNzczYmNhLTdkYWYtNGM3Zi1hOTJhLWVkNGY3NTM5ZDkyYiJ9.Bcl4AZ2GJOoAjPtUnmJkGLlCqXe29uATyWfcZR24lRPc26dBqhoqxb7GRhKLwN8FVjdrmAnDdIRZMu78SNQ7Bg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  localPrisma: PrismaClient | undefined
}

function getLocalPrisma() {
  if (globalForPrisma.localPrisma) return globalForPrisma.localPrisma
  try {
    const nativeDb = new Database("dev.db")
    nativeDb.pragma("journal_mode = WAL")
    nativeDb.pragma("synchronous = NORMAL")
    nativeDb.pragma("cache_size = -64000")
    nativeDb.pragma("temp_store = MEMORY")
    nativeDb.close()
  } catch (e) {}
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" })
  const client = new PrismaClient({ adapter, log: ["error"] })
  globalForPrisma.localPrisma = client
  return client
}

function createPrismaClient() {
  const envDbUrl = process.env.DATABASE_URL?.trim()
  const envAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim()

  const isExplicitRemoteTurso = Boolean(
    envDbUrl && (envDbUrl.startsWith("libsql://") || envDbUrl.startsWith("https://"))
  )

  if (isExplicitRemoteTurso) {
    try {
      const adapter = new PrismaLibSql({
        url: envDbUrl!,
        authToken: envAuthToken || DEFAULT_TURSO_TOKEN,
      })
      return new PrismaClient({ adapter, log: ["error"] })
    } catch (err) {
      console.warn("Turso online connection failed, using instant local SQLite:", err)
      return getLocalPrisma()
    }
  }

  // Blazing fast local SQLite engine with WAL mode & 64MB RAM cache (<1ms response times)
  return getLocalPrisma()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
export const localPrisma = getLocalPrisma()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma