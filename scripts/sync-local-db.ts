import Database from "better-sqlite3"
import bcrypt from "bcryptjs"
import path from "path"

const dbPath = path.join(process.cwd(), "dev.db")
console.log("Syncing local database at:", dbPath)

const db = new Database(dbPath)

async function run() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      emailVerified DATETIME,
      image TEXT,
      bannerImage TEXT,
      password TEXT,
      provider TEXT,
      systemRole TEXT DEFAULT 'USER',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'APPROVED',
      requestedBy TEXT,
      isPrivate BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_team_roles (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      teamId TEXT NOT NULL,
      committeeName TEXT,
      customRoleTitle TEXT NOT NULL,
      status TEXT DEFAULT 'APPROVED',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(teamId) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(userId, teamId, committeeName, customRoleTitle)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      hasScreen BOOLEAN DEFAULT 0,
      hasBalcony BOOLEAN DEFAULT 0,
      hasAC BOOLEAN DEFAULT 1,
      hasWhiteboard BOOLEAN DEFAULT 1,
      hasPowerOutlets BOOLEAN DEFAULT 1,
      description TEXT,
      svgPolygonCoords TEXT NOT NULL,
      svgX REAL DEFAULT 0,
      svgY REAL DEFAULT 0,
      color TEXT DEFAULT '#67C2B2',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      userId TEXT NOT NULL,
      teamId TEXT NOT NULL,
      roleTitleUsed TEXT NOT NULL,
      projectOrCommitteeName TEXT NOT NULL,
      startTime DATETIME NOT NULL,
      endTime DATETIME NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDING',
      paymentStatus TEXT DEFAULT 'CASH_PENDING',
      priorityScore INTEGER DEFAULT 0,
      rejectionReason TEXT,
      isIncognito BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(teamId) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  const defaultPasswordHash = await bcrypt.hash("password123", 10)

  // Users
  const userProfiles = [
    { id: "user-owner", email: "owner@utopi.space", name: "Omar Farooq", systemRole: "OWNER", image: "linear-gradient(to top right, #9333ea, #6366f1)" },
    { id: "user-manager", email: "manager@utopi.space", name: "Alex Manager", systemRole: "WORKSPACE_MANAGER", image: "linear-gradient(to top right, #2563eb, #22d3ee)" },
    { id: "user-admin", email: "admin@utopi.space", name: "Amr El-Sayed", systemRole: "ADMIN", image: "linear-gradient(to top right, #3f3f46, #0f172a)" },
    { id: "user-1", email: "alice@hawkinsight.com", name: "Alice Chen", systemRole: "USER", image: "linear-gradient(to top right, #059669, #2dd4bf)" },
    { id: "user-2", email: "bob@hawkinsight.com", name: "Bob Martinez", systemRole: "USER", image: "linear-gradient(to top right, #db2777, #fb7185)" },
    { id: "user-3", email: "carol@nexuslabs.com", name: "Carol Kim", systemRole: "USER", image: "linear-gradient(to top right, #9333ea, #6366f1)" },
    { id: "user-4", email: "david@freelancer.com", name: "David Park", systemRole: "USER", image: "linear-gradient(to top right, #3f3f46, #0f172a)" },
    { id: "user-tarek", email: "tarek@hackerrank-aufs.org", name: "Tarek Mansour", systemRole: "USER", image: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
    { id: "user-hr-2", email: "laila@hackerrank-aufs.org", name: "Laila Nader", systemRole: "USER", image: "linear-gradient(to top right, #2563eb, #22d3ee)" },
    { id: "user-karim", email: "karim@phd-case.org", name: "Karim Zaki", systemRole: "USER", image: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
    { id: "user-phd-2", email: "youssef@phd-case.org", name: "Youssef Hassan", systemRole: "USER", image: "linear-gradient(to top right, #059669, #2dd4bf)" },
    { id: "user-guest", email: "guest@utopi.space", name: "Gabriel Miller", systemRole: "USER", image: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
    { id: "user-sarah", email: "sarah@visitor.space", name: "Sarah Jenkins", systemRole: "USER", image: "linear-gradient(to top right, #db2777, #fb7185)" },
  ]

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password, provider, systemRole, image, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, 'credentials', ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      password = excluded.password,
      systemRole = excluded.systemRole,
      image = excluded.image,
      updatedAt = datetime('now')
  `)

  for (const u of userProfiles) {
    insertUser.run(u.id, u.email, u.name, defaultPasswordHash, u.systemRole, u.image)
  }

  // Teams
  const teams = [
    { id: "hawk-insight", name: "Hawk Insight", description: "Strategic communications and public relations agency" },
    { id: "nexus-labs", name: "Nexus Labs", description: "Innovation lab focused on AI and emerging technologies" },
    { id: "hackerrank-aufs", name: "HackerRank AUFS", description: "Technical chapter for algorithms, hackathons, and competitive programming" },
    { id: "phd", name: "PHD", description: "Pacemakers' Hardest Decision - Business Strategy & Leadership Consortium" },
  ]

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, description, status, createdAt, updatedAt)
    VALUES (?, ?, ?, 'APPROVED', datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      updatedAt = datetime('now')
  `)

  for (const t of teams) {
    insertTeam.run(t.id, t.name, t.description)
  }

  // Team Roles
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

  const insertRole = db.prepare(`
    INSERT INTO user_team_roles (id, userId, teamId, committeeName, customRoleTitle, status, createdAt)
    VALUES (?, ?, ?, ?, ?, 'APPROVED', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      committeeName = excluded.committeeName,
      customRoleTitle = excluded.customRoleTitle
  `)

  for (const tr of teamRoles) {
    insertRole.run(tr.id, tr.userId, tr.teamId, tr.committeeName, tr.customRoleTitle)
  }

  // Rooms
  const rooms = [
    { id: "hall-1", name: "Main Hall", capacity: 30, hasScreen: 1, hasBalcony: 1, hasAC: 1, hasWhiteboard: 1, hasPowerOutlets: 1, description: "Large conference hall with air conditioning, presentation screen/TV, magnetic whiteboard, ceiling fans, power sockets, and private room balcony access.", svgPolygonCoords: "M115,45 L385,45 L385,220 L115,220 Z", svgX: 250, svgY: 132, color: "#67C2B2" },
    { id: "hall-3", name: "Focus Room", capacity: 20, hasScreen: 1, hasBalcony: 0, hasAC: 1, hasWhiteboard: 1, hasPowerOutlets: 1, description: "Collaboration and focus room with air conditioning, presentation screen/TV, whiteboard, ceiling fans, and power sockets.", svgPolygonCoords: "M397,45 L557,45 L557,220 L397,220 Z", svgX: 477, svgY: 132, color: "#5AB0A0" },
    { id: "hall-2", name: "Meeting Room", capacity: 10, hasScreen: 0, hasBalcony: 0, hasAC: 0, hasWhiteboard: 0, hasPowerOutlets: 1, description: "Compact meeting room with ceiling fans and power sockets.", svgPolygonCoords: "M569,45 L714,45 L714,220 L569,220 Z", svgX: 641.5, svgY: 132, color: "#A286DB" },
    { id: "shared-area", name: "Shared Area", capacity: 50, hasScreen: 0, hasBalcony: 1, hasAC: 0, hasWhiteboard: 0, hasPowerOutlets: 1, description: "Open co-working area for up to 50 people with natural airflow, double balcony access, ceiling fans, and power sockets throughout.", svgPolygonCoords: "M115,232 L275,232 L275,475 L115,475 Z", svgX: 195, svgY: 353, color: "#2D6A4F" },
  ]

  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, name, capacity, hasScreen, hasBalcony, hasAC, hasWhiteboard, hasPowerOutlets, description, svgPolygonCoords, svgX, svgY, color, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      capacity = excluded.capacity,
      description = excluded.description,
      updatedAt = datetime('now')
  `)

  for (const r of rooms) {
    insertRoom.run(r.id, r.name, r.capacity, r.hasScreen, r.hasBalcony, r.hasAC, r.hasWhiteboard, r.hasPowerOutlets, r.description, r.svgPolygonCoords, r.svgX, r.svgY, r.color)
  }

  // Clear any bookings & notifications
  db.exec("DELETE FROM bookings;")
  db.exec("DELETE FROM notifications;")

  console.log("✅ Local SQLite database dev.db synced cleanly with no mock bookings!")
}

run()
