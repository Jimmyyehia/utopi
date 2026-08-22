import { createClient } from "@libsql/client"
import { fileURLToPath } from "url"
import { dirname, join, resolve } from "path"
import { readFileSync, existsSync } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Auto-load .env variables
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

const dbPath = join(__dirname, "..", "dev.db")
const databaseUrl = process.env.DATABASE_URL || `file:${dbPath}`
const authToken = process.env.DATABASE_AUTH_TOKEN

console.log("DB Target:", databaseUrl.startsWith("libsql://") ? "Turso Serverless Cloud Database" : dbPath)

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
})

async function main() {
  console.log("🌱 Seeding database: Decreased Focus Room width (160px)...")

  // Test connection
  await client.execute("SELECT 1")
  console.log("✅ Connection successful")

  // Create users
  const users = [
    { id: "user-owner", email: "owner@utopi.space", name: "Omar Farooq", provider: "credentials", systemRole: "OWNER" },
    { id: "user-manager", email: "manager@utopi.space", name: "Alex Manager", provider: "credentials", systemRole: "WORKSPACE_MANAGER" },
    { id: "user-admin", email: "admin@utopi.space", name: "Admin User", provider: "credentials", systemRole: "ADMIN" },
    { id: "user-1", email: "alice@hawkinsight.com", name: "Alice Chen", provider: "credentials", systemRole: "USER" },
    { id: "user-2", email: "bob@hawkinsight.com", name: "Bob Martinez", provider: "credentials", systemRole: "USER" },
    { id: "user-3", email: "carol@nexuslabs.com", name: "Carol Kim", provider: "credentials", systemRole: "USER" },
    { id: "user-4", email: "david@freelancer.com", name: "David Park", provider: "credentials", systemRole: "USER" },
  ]

  for (const user of users) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, provider, systemRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [user.id, user.email, user.name, user.provider, user.systemRole],
    })
  }
  console.log("✅ Created users")

  // Create teams
  const teams = [
    { id: "hawk-insight", name: "Hawk Insight", description: "Strategic communications and public relations agency" },
    { id: "nexus-labs", name: "Nexus Labs", description: "Innovation lab focused on AI and emerging technologies" },
  ]

  for (const team of teams) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO teams (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      args: [team.id, team.name, team.description],
    })
  }
  console.log("✅ Created teams")

  // Create user team roles (ONLY regular team members belong to tenant teams)
  const userTeamRoles = [
    { id: "utr-alice-pr-head", userId: "user-1", teamId: "hawk-insight", committeeName: "PR", customRoleTitle: "PR Head" },
    { id: "utr-alice-tech-lead", userId: "user-1", teamId: "hawk-insight", committeeName: "Engineering", customRoleTitle: "Technical Lead" },
    { id: "utr-bob-designer", userId: "user-2", teamId: "hawk-insight", committeeName: "Design", customRoleTitle: "Senior Designer" },
    { id: "utr-carol-ai-lead", userId: "user-3", teamId: "nexus-labs", committeeName: "AI Research", customRoleTitle: "AI Research Lead" },
    { id: "utr-david-freelancer", userId: "user-4", teamId: "nexus-labs", committeeName: null, customRoleTitle: "Guest Member" },
  ]

  for (const utr of userTeamRoles) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO user_team_roles (id, userId, teamId, committeeName, customRoleTitle, createdAt) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [utr.id, utr.userId, utr.teamId, utr.committeeName, utr.customRoleTitle],
    })
  }
  console.log("✅ Created user team roles")

  // Delete old rooms first
  await client.execute("DELETE FROM rooms")

  // Focus Room (20 Max - 160px): x: 397..557
  // Meeting Room (10 Max - 145px): x: 569..714
  // Kitchen (179px): x: 726..905
  const rooms = [
    {
      id: "hall-1",
      name: "Main Hall",
      capacity: 30,
      hasScreen: 1,
      hasBalcony: 1,
      hasAC: 1,
      hasWhiteboard: 1,
      hasPowerOutlets: 1,
      description: "Large conference hall with air conditioning, presentation screen/TV, magnetic whiteboard, ceiling fans, power sockets, and private room balcony access.",
      svgPolygonCoords: "M115,45 L385,45 L385,220 L115,220 Z",
      svgX: 250,
      svgY: 132,
      color: "#67C2B2",
    },
    {
      id: "hall-3",
      name: "Focus Room",
      capacity: 20,
      hasScreen: 1,
      hasBalcony: 0,
      hasAC: 1,
      hasWhiteboard: 1,
      hasPowerOutlets: 1,
      description: "Collaboration and focus room with air conditioning, presentation screen/TV, whiteboard, ceiling fans, and power sockets.",
      svgPolygonCoords: "M397,45 L557,45 L557,220 L397,220 Z",
      svgX: 477,
      svgY: 132,
      color: "#5AB0A0",
    },
    {
      id: "hall-2",
      name: "Meeting Room",
      capacity: 10,
      hasScreen: 0,
      hasBalcony: 0,
      hasAC: 0,
      hasWhiteboard: 0,
      hasPowerOutlets: 1,
      description: "Compact meeting room with ceiling fans and power sockets.",
      svgPolygonCoords: "M569,45 L714,45 L714,220 L569,220 Z",
      svgX: 641.5,
      svgY: 132,
      color: "#A286DB",
    },
    {
      id: "shared-area",
      name: "Shared Area",
      capacity: 50,
      hasScreen: 0,
      hasBalcony: 1,
      hasAC: 0,
      hasWhiteboard: 0,
      hasPowerOutlets: 1,
      description: "Open co-working area for up to 50 people with natural airflow, double balcony access, ceiling fans, and power sockets throughout.",
      svgPolygonCoords: "M115,232 L275,232 L275,475 L115,475 Z",
      svgX: 195,
      svgY: 353,
      color: "#2D6A4F",
    },
  ]

  for (const room of rooms) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO rooms (id, name, capacity, hasScreen, hasBalcony, hasAC, hasWhiteboard, hasPowerOutlets, description, svgPolygonCoords, svgX, svgY, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [room.id, room.name, room.capacity, room.hasScreen, room.hasBalcony, room.hasAC, room.hasWhiteboard, room.hasPowerOutlets, room.description, room.svgPolygonCoords, room.svgX, room.svgY, room.color],
    })
  }
  console.log("✅ Created rooms (Main Hall: 30, Focus Room: 20 [160px], Meeting Room: 10 [145px], Shared Area: 50)")

  // Clear any old bookings & notifications
  await client.execute("DELETE FROM bookings")
  await client.execute("DELETE FROM notifications")
  console.log("✅ Cleared bookings and notifications")

  console.log("✅ Database seeded cleanly with no mock bookings!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await client.close()
  })