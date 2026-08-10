import { createClient } from "@libsql/client"
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

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
        process.env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, "$1")
      }
    }
  })
}

const client = createClient({
  url: process.env.DATABASE_URL || "libsql://utopi-jimmyyehia.aws-ap-northeast-1.turso.io",
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

async function runMigration() {
  console.log("Migrating teams table on database...")
  try {
    await client.execute("ALTER TABLE teams ADD COLUMN status TEXT DEFAULT 'APPROVED'")
    console.log("✅ Added status column to teams")
  } catch (e: any) {
    console.log("status column note:", e.message)
  }

  try {
    await client.execute("ALTER TABLE teams ADD COLUMN requestedBy TEXT")
    console.log("✅ Added requestedBy column to teams")
  } catch (e: any) {
    console.log("requestedBy column note:", e.message)
  }
  console.log("Migration complete!")
}

runMigration()
