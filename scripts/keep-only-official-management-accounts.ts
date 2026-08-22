import { createClient } from "@libsql/client"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { readFileSync, existsSync } from "fs"
import bcrypt from "bcryptjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = resolve(__dirname, "../.env")
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["'](.*)["']$/, "$1")
        process.env[key] = value
      }
    }
  })
}

const localDbUrl = `file:${resolve(__dirname, "../dev.db")}`
const cloudDbUrl = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

const OFFICIAL_ACCOUNTS = [
  { id: "user-owner", email: "owner@utopi.space", name: "Omar Farooq", systemRole: "OWNER", image: "linear-gradient(to top right, #9333ea, #6366f1)" },
  { id: "user-manager", email: "manager@utopi.space", name: "Alex Manager", systemRole: "WORKSPACE_MANAGER", image: "linear-gradient(to top right, #2563eb, #22d3ee)" },
  { id: "user-admin", email: "admin@utopi.space", name: "Amr El-Sayed", systemRole: "ADMIN", image: "linear-gradient(to top right, #3f3f46, #0f172a)" },
]

async function cleanDatabase(url: string, token?: string, label = "DB") {
  console.log(`🧹 Cleaning database (${label}): ${url.startsWith("libsql://") ? "Turso Cloud" : "Local SQLite"}...`)
  const client = createClient({ url, authToken: token })
  const hashedPassword = await bcrypt.hash("password123", 10)

  // 1. Delete all user team roles for non-official accounts
  await client.execute({
    sql: `DELETE FROM user_team_roles WHERE userId NOT IN ('user-owner', 'user-manager', 'user-admin') AND userId NOT IN (SELECT id FROM users WHERE email IN ('owner@utopi.space', 'manager@utopi.space', 'admin@utopi.space'))`,
    args: [],
  })

  // 2. Delete all users except official higher accounts
  await client.execute({
    sql: `DELETE FROM users WHERE email NOT IN ('owner@utopi.space', 'manager@utopi.space', 'admin@utopi.space')`,
    args: [],
  })

  // 3. Upsert official accounts with clean credentials
  for (const acc of OFFICIAL_ACCOUNTS) {
    await client.execute({
      sql: `INSERT INTO users (id, email, name, password, provider, systemRole, image, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'credentials', ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(email) DO UPDATE SET
              name = excluded.name,
              password = excluded.password,
              systemRole = excluded.systemRole,
              image = excluded.image,
              updatedAt = datetime('now')`,
      args: [acc.id, acc.email, acc.name, hashedPassword, acc.systemRole, acc.image],
    })
  }

  const res = await client.execute("SELECT id, name, email, systemRole FROM users")
  console.log(`✅ ${label} clean! Total remaining users: ${res.rows.length}`)
  console.table(res.rows)
}

async function main() {
  console.log("==================================================")
  console.log("🌟 PURGING TEST ACCOUNTS & PRESERVING OFFICIAL MANAGEMENT ACCOUNTS")
  console.log("==================================================")

  await cleanDatabase(localDbUrl, undefined, "Local SQLite")

  if (cloudDbUrl && (cloudDbUrl.startsWith("libsql://") || cloudDbUrl.startsWith("https://"))) {
    await cleanDatabase(cloudDbUrl, authToken, "Turso Cloud DB")
  }

  console.log("\n🎉 All test/sample accounts purged! Only official management accounts remain.")
}

main().catch(console.error)
