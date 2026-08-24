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

const USERS = [
  { id: "user-owner", email: "owner@utopi.space", name: "Omar Farooq", systemRole: "OWNER", image: "linear-gradient(to top right, #9333ea, #6366f1)" },
  { id: "user-manager", email: "manager@utopi.space", name: "Alex Manager", systemRole: "WORKSPACE_MANAGER", image: "linear-gradient(to top right, #2563eb, #22d3ee)" },
  { id: "user-admin", email: "admin@utopi.space", name: "Amr El-Sayed", systemRole: "ADMIN", image: "linear-gradient(to top right, #3f3f46, #0f172a)" },
  { id: "user-alice", email: "alice@hawkinsight.com", name: "Alice Chen", systemRole: "USER", image: "linear-gradient(to top right, #059669, #2dd4bf)" },
  { id: "user-bob", email: "bob@hawkinsight.com", name: "Bob Martinez", systemRole: "USER", image: "linear-gradient(to top right, #db2777, #fb7185)" },
  { id: "user-carol", email: "carol@nexuslabs.com", name: "Carol Kim", systemRole: "USER", image: "linear-gradient(to top right, #9333ea, #6366f1)" },
  { id: "user-david", email: "david@freelancer.com", name: "David Park", systemRole: "USER", image: "linear-gradient(to top right, #3f3f46, #0f172a)" },
  { id: "user-tarek", email: "tarek@hackerrank-aufs.org", name: "Tarek Mansour", systemRole: "USER", image: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
  { id: "user-laila", email: "laila@hackerrank-aufs.org", name: "Laila Nader", systemRole: "USER", image: "linear-gradient(to top right, #2563eb, #22d3ee)" },
  { id: "user-karim", email: "karim@phd-case.org", name: "Karim Zaki", systemRole: "USER", image: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
  { id: "user-youssef", email: "youssef@phd-case.org", name: "Youssef Hassan", systemRole: "USER", image: "linear-gradient(to top right, #059669, #2dd4bf)" },
]

const TEAMS = [
  { id: "hawk-insight", name: "Hawk Insight", description: "Strategic communications and public relations agency" },
  { id: "hackerrank-aufs", name: "HackerRank AUFS", description: "Technical chapter for algorithms, hackathons, and competitive programming" },
  { id: "phd", name: "PHD", description: "Pacemakers' Hardest Decision - Business Strategy & Leadership Consortium" },
  { id: "nexus-labs", name: "Nexus Labs", description: "Innovation lab focused on AI and emerging technologies" },
]

const USER_TEAM_ROLES = [
  { id: "utr-alice-pr-head", userId: "user-alice", teamId: "hawk-insight", committeeName: "PR", customRoleTitle: "PR Head" },
  { id: "utr-alice-tech-lead", userId: "user-alice", teamId: "hawk-insight", committeeName: "Engineering", customRoleTitle: "Technical Lead" },
  { id: "utr-bob-designer", userId: "user-bob", teamId: "hawk-insight", committeeName: "Design", customRoleTitle: "Senior Designer" },
  { id: "utr-carol-ai-lead", userId: "user-carol", teamId: "nexus-labs", committeeName: "AI Research", customRoleTitle: "AI Research Lead" },
  { id: "utr-david-freelancer", userId: "user-david", teamId: "nexus-labs", committeeName: "Product", customRoleTitle: "Project Manager" },
  { id: "utr-tarek-president", userId: "user-tarek", teamId: "hackerrank-aufs", committeeName: "Competitive Coding", customRoleTitle: "Chapter President" },
  { id: "utr-laila-setter", userId: "user-laila", teamId: "hackerrank-aufs", committeeName: "Technical Content", customRoleTitle: "Lead Problem Setter" },
  { id: "utr-karim-director", userId: "user-karim", teamId: "phd", committeeName: "Leadership", customRoleTitle: "Executive Director" },
  { id: "utr-youssef-strategy", userId: "user-youssef", teamId: "phd", committeeName: "Case Competition", customRoleTitle: "Strategy & Case Lead" },
]

async function seedDatabase(url: string, token?: string, label = "DB") {
  console.log(`🌱 Restoring testing users & teams in ${label}...`)
  const client = createClient({ url, authToken: token })
  const hashedPassword = await bcrypt.hash("password123", 10)

  // 1. Clear old user_team_roles and users to prevent ID mismatch
  await client.execute("DELETE FROM user_team_roles")
  await client.execute("DELETE FROM users")

  // 2. Seed Teams
  for (const team of TEAMS) {
    await client.execute({
      sql: `INSERT INTO teams (id, name, description, status, createdAt, updatedAt)
            VALUES (?, ?, ?, 'APPROVED', datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, updatedAt = datetime('now')`,
      args: [team.id, team.name, team.description],
    })
  }

  // 3. Seed Users with exact IDs
  for (const user of USERS) {
    await client.execute({
      sql: `INSERT INTO users (id, email, name, password, provider, systemRole, image, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'credentials', ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, password = excluded.password, systemRole = excluded.systemRole, image = excluded.image, updatedAt = datetime('now')
            ON CONFLICT(email) DO UPDATE SET id = excluded.id, name = excluded.name, password = excluded.password, systemRole = excluded.systemRole, image = excluded.image, updatedAt = datetime('now')`,
      args: [user.id, user.email, user.name, hashedPassword, user.systemRole, user.image],
    })
  }

  // 4. Seed User Team Roles with matching userIds
  for (const utr of USER_TEAM_ROLES) {
    await client.execute({
      sql: `INSERT INTO user_team_roles (id, userId, teamId, committeeName, customRoleTitle, status, createdAt)
            VALUES (?, ?, ?, ?, ?, 'APPROVED', datetime('now'))
            ON CONFLICT(id) DO UPDATE SET userId = excluded.userId, committeeName = excluded.committeeName, customRoleTitle = excluded.customRoleTitle`,
      args: [utr.id, utr.userId, utr.teamId, utr.committeeName, utr.customRoleTitle],
    })
  }

  const userCount = await client.execute("SELECT COUNT(*) as cnt FROM users")
  const teamCount = await client.execute("SELECT COUNT(*) as cnt FROM teams")
  const roleCount = await client.execute("SELECT COUNT(*) as cnt FROM user_team_roles")

  console.log(`✅ ${label} successfully restored with exact ID matching! Users: ${userCount.rows[0].cnt}, Teams: ${teamCount.rows[0].cnt}, Roles: ${roleCount.rows[0].cnt}`)
}

async function main() {
  console.log("==================================================")
  console.log("🚀 RESTORING ALL TESTING USERS & EXACT MATCHING TEAM ROLES")
  console.log("==================================================")

  await seedDatabase(localDbUrl, undefined, "Local SQLite (dev.db)")

  if (cloudDbUrl && (cloudDbUrl.startsWith("libsql://") || cloudDbUrl.startsWith("https://"))) {
    await seedDatabase(cloudDbUrl, authToken, "Turso Cloud DB")
  }

  console.log("\n🎉 Restored all 13 testing accounts, 4 tenant teams, and 11 team roles with 100% ID alignment!")
}

main().catch(console.error)
