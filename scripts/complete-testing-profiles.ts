import { createClient } from "@libsql/client"
import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"

dotenv.config()

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  console.error("No DATABASE_URL found in .env")
  process.exit(1)
}

console.log("Connecting to Database at:", url)

const client = createClient({
  url,
  authToken,
})

async function run() {
  console.log("🚀 Enhancing test account profiles in Database...")

  const defaultPasswordHash = await bcrypt.hash("password123", 10)

  // 1. Update/Ensure User records with full names, avatars, passwords
  const userProfiles = [
    {
      id: "user-owner",
      email: "owner@utopi.space",
      name: "Omar Farooq",
      systemRole: "OWNER",
      image: "linear-gradient(to top right, #9333ea, #6366f1)",
    },
    {
      id: "user-manager",
      email: "manager@utopi.space",
      name: "Alex Manager",
      systemRole: "WORKSPACE_MANAGER",
      image: "linear-gradient(to top right, #2563eb, #22d3ee)",
    },
    {
      id: "user-admin",
      email: "admin@utopi.space",
      name: "Amr El-Sayed",
      systemRole: "ADMIN",
      image: "linear-gradient(to top right, #3f3f46, #0f172a)",
    },
    {
      id: "user-1",
      email: "alice@hawkinsight.com",
      name: "Alice Chen",
      systemRole: "USER",
      image: "linear-gradient(to top right, #059669, #2dd4bf)",
    },
    {
      id: "user-2",
      email: "bob@hawkinsight.com",
      name: "Bob Martinez",
      systemRole: "USER",
      image: "linear-gradient(to top right, #db2777, #fb7185)",
    },
    {
      id: "user-3",
      email: "carol@nexuslabs.com",
      name: "Carol Kim",
      systemRole: "USER",
      image: "linear-gradient(to top right, #9333ea, #6366f1)",
    },
    {
      id: "user-4",
      email: "david@freelancer.com",
      name: "David Park",
      systemRole: "USER",
      image: "linear-gradient(to top right, #3f3f46, #0f172a)",
    },
    {
      id: "user-tarek",
      email: "tarek@hackerrank-aufs.org",
      name: "Tarek Mansour",
      systemRole: "USER",
      image: "linear-gradient(to top right, #f59e0b, #f43f5e)",
    },
    {
      id: "user-hr-2",
      email: "laila@hackerrank-aufs.org",
      name: "Laila Nader",
      systemRole: "USER",
      image: "linear-gradient(to top right, #2563eb, #22d3ee)",
    },
    {
      id: "user-karim",
      email: "karim@phd-case.org",
      name: "Karim Zaki",
      systemRole: "USER",
      image: "linear-gradient(to top right, #f59e0b, #f43f5e)",
    },
    {
      id: "user-phd-2",
      email: "youssef@phd-case.org",
      name: "Youssef Hassan",
      systemRole: "USER",
      image: "linear-gradient(to top right, #059669, #2dd4bf)",
    },
    {
      id: "user-guest",
      email: "guest@utopi.space",
      name: "Gabriel Miller",
      systemRole: "USER",
      image: "linear-gradient(to top right, #f59e0b, #f43f5e)",
    },
    {
      id: "user-sarah",
      email: "sarah@visitor.space",
      name: "Sarah Jenkins",
      systemRole: "USER",
      image: "linear-gradient(to top right, #db2777, #fb7185)",
    },
  ]

  for (const u of userProfiles) {
    await client.execute({
      sql: `INSERT INTO users (id, email, name, password, provider, systemRole, image, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'credentials', ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              password = excluded.password,
              systemRole = excluded.systemRole,
              image = COALESCE(users.image, excluded.image),
              updatedAt = datetime('now');`,
      args: [u.id, u.email, u.name, defaultPasswordHash, u.systemRole, u.image],
    })
  }
  console.log("✅ Updated testing account user records with names, passwords & avatars.")

  // Add status column to user_team_roles if missing
  try {
    await client.execute("ALTER TABLE user_team_roles ADD COLUMN status TEXT DEFAULT 'APPROVED';")
  } catch (e) {
    // Ignore if already exists
  }

  // 2. Ensure non-management users have team roles in user_team_roles
  const teamRoles = [
    { id: "utr-alice-pr-head", userId: "user-1", teamId: "hawk-insight", committeeName: "PR", customRoleTitle: "PR Head" },
    { id: "utr-alice-tech-lead", userId: "user-1", teamId: "hawk-insight", committeeName: "Engineering", customRoleTitle: "Technical Lead" },
    { id: "utr-bob-designer", userId: "user-2", teamId: "hawk-insight", committeeName: "Design", customRoleTitle: "Senior Designer" },
    { id: "utr-carol-ai-lead", userId: "user-3", teamId: "nexus-labs", committeeName: "AI Research", customRoleTitle: "AI Research Lead" },
    { id: "utr-david-pm", userId: "user-4", teamId: "nexus-labs", committeeName: "Product", customRoleTitle: "Project Manager" },
    { id: "utr-tarek-pres", userId: "user-tarek", teamId: "hackerrank-aufs", committeeName: "Competitive Coding", customRoleTitle: "Chapter President" },
    { id: "utr-laila-setter", userId: "user-hr-2", teamId: "hackerrank-aufs", committeeName: "Technical Content", customRoleTitle: "Lead Problem Setter" },
    { id: "utr-karim-exec", userId: "user-karim", teamId: "phd", committeeName: "Leadership", customRoleTitle: "Executive Director" },
    { id: "utr-youssef-case", userId: "user-phd-2", teamId: "phd", committeeName: "Case Competition", customRoleTitle: "Strategy & Case Lead" },
    { id: "utr-guest-founder", userId: "user-guest", teamId: "hawk-insight", committeeName: "Media Operations", customRoleTitle: "Founder" },
    { id: "utr-sarah-vp", userId: "user-sarah", teamId: "nexus-labs", committeeName: "Operations", customRoleTitle: "Vice President" },
  ]

  for (const tr of teamRoles) {
    await client.execute({
      sql: `INSERT INTO user_team_roles (id, userId, teamId, committeeName, customRoleTitle, status, createdAt)
            VALUES (?, ?, ?, ?, ?, 'APPROVED', datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              committeeName = excluded.committeeName,
              customRoleTitle = excluded.customRoleTitle;`,
      args: [tr.id, tr.userId, tr.teamId, tr.committeeName, tr.customRoleTitle],
    })
  }
  console.log("✅ Updated user team roles for all testing accounts.")

  console.log("🎉 All testing profiles successfully enhanced!")
}

run().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
