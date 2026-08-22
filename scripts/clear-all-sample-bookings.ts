import Database from "better-sqlite3"
import { createClient } from "@libsql/client"
import path from "path"
import * as dotenv from "dotenv"

dotenv.config()

async function run() {
  console.log("🧹 Clearing all NPC / sample booking requests & notifications...")

  // 1. Clear local SQLite dev.db
  const dbPath = path.join(process.cwd(), "dev.db")
  const localDb = new Database(dbPath)
  localDb.exec("DELETE FROM bookings;")
  localDb.exec("DELETE FROM notifications;")
  console.log("✅ Cleared local dev.db bookings & notifications!")

  // 2. Clear Turso Cloud DB if configured
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("libsql://")) {
    const cloudClient = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
    await cloudClient.execute("DELETE FROM bookings;")
    await cloudClient.execute("DELETE FROM notifications;")
    console.log("✅ Cleared Turso Cloud DB bookings & notifications!")
    await cloudClient.close()
  }

  console.log("🎉 All sample/NPC booking requests and notifications have been completely wiped!")
}

run().catch(console.error)
