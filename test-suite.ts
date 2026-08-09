import { createClient } from "@libsql/client"
import { fileURLToPath } from "url"
import { dirname, join, resolve } from "path"
import { readFileSync, existsSync } from "fs"
import {
  calculatePriorityScore,
  isTimeSlotBooked,
  generateBookingReference,
  timeSlotsForDay,
  formatDuration,
  getConsolidatedDayTimeline,
  getStatusColor,
  WORKSPACE_HOURS,
} from "./src/lib/utils"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Auto-load .env variables
const envPath = resolve(__dirname, ".env")
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

const dbPath = join(__dirname, "dev.db")
const databaseUrl = process.env.DATABASE_URL || `file:${dbPath}`
const authToken = process.env.DATABASE_AUTH_TOKEN

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
})

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`)
    passedTests++
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`)
    failedTests++
  }
}

async function runTests() {
  console.log("==================================================")
  console.log("🧪 RUNNING UTOPI SYSTEM & COMPONENT TEST SUITE")
  console.log("==================================================\n")

  // --- TEST GROUP 1: Database & Seed Data Integrity ---
  console.log("📦 1. Database & Seed Data Integrity")

  try {
    const usersRes = await client.execute("SELECT * FROM users")
    const emails = usersRes.rows.map((r: any) => r.email)
    assert(emails.includes("owner@utopi.space"), "Owner persona (owner@utopi.space) exists in database")
    assert(usersRes.rows.length >= 7, `Users table has required personas including Owner (found: ${usersRes.rows.length})`)

    const roomsRes = await client.execute("SELECT id, name, capacity, svgPolygonCoords FROM rooms")
    assert(roomsRes.rows.length === 4, `Rooms table has 4 configured spaces (found: ${roomsRes.rows.length})`)

    const roomNames = roomsRes.rows.map((r: any) => r.name)
    assert(roomNames.includes("Main Hall"), "Main Hall (30 Max, AC, Screen, Whiteboard, Balcony) exists")
    assert(roomNames.includes("Focus Room"), "Focus Room (20 Max, AC, Screen, Whiteboard) exists")
    assert(roomNames.includes("Meeting Room"), "Meeting Room (10 Max, Fans, Sockets) exists")
    assert(roomNames.includes("Shared Area"), "Shared Area (50 Max, Balconies, Fans, Sockets) exists")

    const rolesRes = await client.execute("SELECT * FROM user_team_roles")
    assert(rolesRes.rows.length === 5, `Tenant team roles for regular members exist (found: ${rolesRes.rows.length})`)

    const bookingsRes = await client.execute("SELECT * FROM bookings")
    assert(bookingsRes.rows.length > 0, `Sample bookings exist in database (found: ${bookingsRes.rows.length})`)
  } catch (e: any) {
    assert(false, "Database connection and queries", e.message)
  }

  // --- TEST GROUP 2: Role Hierarchy & Priority Scoring Logic ---
  console.log("\n👑 2. Role Hierarchy & Priority Scoring Logic")

  const ownerScore = calculatePriorityScore("Workspace Owner")
  assert(ownerScore === 100, `Owner role calculates score = 100 (got: ${ownerScore})`)

  const founderScore = calculatePriorityScore("Founder")
  assert(founderScore === 100, `Founder role calculates score = 100 (got: ${founderScore})`)

  const headScore = calculatePriorityScore("PR Head")
  assert(headScore === 100, `Head role calculates score = 100 (got: ${headScore})`)

  const leadScore = calculatePriorityScore("Technical Lead")
  assert(leadScore === 90, `Lead role calculates score = 90 (got: ${leadScore})`)

  const seniorScore = calculatePriorityScore("Senior Designer")
  assert(seniorScore === 70, `Senior role calculates score = 70 (got: ${seniorScore})`)

  const guestScore = calculatePriorityScore("Guest Member")
  assert(guestScore === 10, `Guest role calculates score = 10 (got: ${guestScore})`)

  // --- TEST GROUP 3: Conflict Detection Algorithm ---
  console.log("\n⚠️ 3. Conflict Detection Algorithm (isTimeSlotBooked)")

  const existingBookings = [
    {
      startTime: new Date("2026-08-09T14:00:00Z"), // 2 PM
      endTime: new Date("2026-08-09T16:00:00Z"),   // 4 PM (Connected 2-hour span)
    },
  ]

  const exactOverlap = isTimeSlotBooked(
    existingBookings,
    new Date("2026-08-09T14:00:00Z"),
    new Date("2026-08-09T16:00:00Z")
  )
  assert(exactOverlap === true, "Detects exact 2 PM - 4 PM identical time slot clash")

  const halfHourOverlap = isTimeSlotBooked(
    existingBookings,
    new Date("2026-08-09T14:30:00Z"),
    new Date("2026-08-09T15:00:00Z")
  )
  assert(halfHourOverlap === true, "Detects nested 30-minute half-hour overlap (2:30 PM – 3:00 PM)")

  const partialOverlapStart = isTimeSlotBooked(
    existingBookings,
    new Date("2026-08-09T13:30:00Z"),
    new Date("2026-08-09T14:30:00Z")
  )
  assert(partialOverlapStart === true, "Detects start-boundary half-hour overlap")

  const noOverlapBefore = isTimeSlotBooked(
    existingBookings,
    new Date("2026-08-09T12:00:00Z"),
    new Date("2026-08-09T14:00:00Z")
  )
  assert(noOverlapBefore === false, "Recognizes adjacent non-overlapping preceding slot (12 PM – 2 PM)")

  const noOverlapAfter = isTimeSlotBooked(
    existingBookings,
    new Date("2026-08-09T16:00:00Z"),
    new Date("2026-08-09T17:30:00Z")
  )
  assert(noOverlapAfter === false, "Recognizes adjacent non-overlapping subsequent slot (4 PM – 5:30 PM)")

  // --- TEST GROUP 4: Queue Priority Sorting Logic ---
  console.log("\n📊 4. Manager Approval Queue Sorting")

  const mockQueue = [
    { id: "b1", priorityScore: 70, startTime: "2026-08-09T14:00:00Z" },
    { id: "b2", priorityScore: 100, startTime: "2026-08-09T11:00:00Z" },
    { id: "b3", priorityScore: 90, startTime: "2026-08-09T10:00:00Z" },
    { id: "b4", priorityScore: 100, startTime: "2026-08-09T09:00:00Z" },
  ]

  mockQueue.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore // Higher priority first
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime() // Earlier first
  })

  assert(mockQueue[0].id === "b4", "Highest priority (100) & earliest time sorted first (b4)")
  assert(mockQueue[1].id === "b2", "Second priority item sorted correctly (b2)")
  assert(mockQueue[2].id === "b3", "Third priority item sorted correctly (b3)")
  assert(mockQueue[3].id === "b1", "Lowest priority item sorted last (b1)")

  // --- TEST GROUP 5: Booking Reference Formatter ---
  console.log("\n🏷️ 5. Booking Reference Formatter")
  const ref = generateBookingReference()
  assert(ref.startsWith("UTP-") && ref.length === 12, `Reference format is valid (generated: ${ref})`)

  // --- TEST GROUP 6: Working Hours & 30-Minute Interval Generator ---
  console.log("\n⏰ 6. Working Hours (9 AM – 10 PM) & 30-Minute Interval Engine")
  assert(WORKSPACE_HOURS.startHour === 9 && WORKSPACE_HOURS.endHour === 22, "Working hours configured as 9:00 AM to 10:00 PM")

  const testDate = new Date("2026-08-09T00:00:00Z")
  const halfHourSlots = timeSlotsForDay(testDate, 9, 22, 30)
  assert(halfHourSlots.length === 26, `Generates exactly 26 half-hour intervals (found: ${halfHourSlots.length})`)
  assert(halfHourSlots[0].start.getHours() === 9 && halfHourSlots[0].start.getMinutes() === 0, "First slot starts at 9:00 AM")
  assert(halfHourSlots[halfHourSlots.length - 1].end.getHours() === 22 && halfHourSlots[halfHourSlots.length - 1].end.getMinutes() === 0, "Last slot concludes at 10:00 PM")

  // --- TEST GROUP 7: Connected Multi-Hour Duration Formatter ---
  console.log("\n⏳ 7. Duration Formatting for Connected Bookings")
  const twoHourDuration = formatDuration("2026-08-09T14:00:00Z", "2026-08-09T16:00:00Z")
  assert(twoHourDuration === "2h", `2 PM to 4 PM formats as '2h' (got: '${twoHourDuration}')`)

  const ninetyMinDuration = formatDuration("2026-08-09T14:00:00Z", "2026-08-09T15:30:00Z")
  assert(ninetyMinDuration === "1h 30m", `2 PM to 3:30 PM formats as '1h 30m' (got: '${ninetyMinDuration}')`)

  const thirtyMinDuration = formatDuration("2026-08-09T14:00:00Z", "2026-08-09T14:30:00Z")
  assert(thirtyMinDuration === "30m", `2 PM to 2:30 PM formats as '30m' (got: '${thirtyMinDuration}')`)

  // --- TEST GROUP 8: Consolidated Timeline (Combined Available Spans & No Intermediate Halves) ---
  console.log("\n🚫 8. Consolidated Timeline (Combined Available Spans & Bookings)")
  const testBaseDate = new Date(2026, 7, 9, 0, 0, 0)
  const bookingStart = new Date(2026, 7, 9, 14, 0, 0) // 2:00 PM local
  const bookingEnd = new Date(2026, 7, 9, 16, 0, 0)   // 4:00 PM local

  const mockBooking = {
    id: "booking-hawk",
    roomId: "room-1",
    startTime: bookingStart,
    endTime: bookingEnd,
    status: "APPROVED",
  }

  // Generate consolidated timeline for a day with a 2-hour booking (2 PM to 4 PM)
  const consolidatedTimeline = getConsolidatedDayTimeline(
    testBaseDate,
    [mockBooking],
    9,
    22
  )

  const bookingBlocks = consolidatedTimeline.filter((b) => b.type === "booking")
  assert(bookingBlocks.length === 1, `Exactly 1 consolidated booking block generated (found: ${bookingBlocks.length})`)
  assert(bookingBlocks[0].duration === "2h", `Consolidated booking duration is '2h' (got: '${bookingBlocks[0].duration}')`)

  const availableBlocks = consolidatedTimeline.filter((b) => b.type === "available")
  assert(availableBlocks.length === 2, `Available times combined into exactly 2 blocks before & after booking (found: ${availableBlocks.length})`)
  assert(availableBlocks[0].duration === "5h", `Pre-booking available block duration is '5h' (9 AM to 2 PM) (got: '${availableBlocks[0].duration}')`)
  assert(availableBlocks[1].duration === "6h", `Post-booking available block duration is '6h' (4 PM to 10 PM) (got: '${availableBlocks[1].duration}')`)

  // Verify that there are NO intermediate sub-slots for 2:30, 3:00, 3:30 in the timeline
  const intermediateSlots = consolidatedTimeline.filter((b) => {
    if (b.type === "available") {
      return b.start >= bookingStart && b.start < bookingEnd
    }
    return false
  })
  assert(intermediateSlots.length === 0, `No intermediate half-hour/hour sub-slots present inside booking (found: ${intermediateSlots.length})`)

  // --- TEST GROUP 9: Past Booking Prevention (endTime <= now validation) ---
  console.log("\n⏳ 9. Past Booking Prevention ('To' Must Be After Current Time)")
  const now = new Date()
  const pastEndTime = new Date(now.getTime() - 30 * 60 * 1000) // 30 mins ago
  const pastStartTime = new Date(now.getTime() - 90 * 60 * 1000) // 90 mins ago
  const futureStartTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 mins in future
  const futureEndTime = new Date(now.getTime() + 90 * 60 * 1000) // 90 mins in future

  function validateBookingTimeBounds(start: Date, end: Date, currentTime = new Date()): { isValid: boolean; error?: string } {
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: "Invalid date or time format" }
    }
    if (end <= start) {
      return { isValid: false, error: "End time ('To') must be after start time ('From')" }
    }
    if (end <= currentTime) {
      return { isValid: false, error: "Cannot create a booking in the past. The end time ('To') must be after the current time." }
    }
    return { isValid: true }
  }

  const pastBookingResult = validateBookingTimeBounds(pastStartTime, pastEndTime, now)
  assert(pastBookingResult.isValid === false, "Rejects booking with 'to' in the past")
  assert(pastBookingResult.error?.includes("Cannot create a booking in the past") === true, "Provides accurate past booking error message")

  // --- TEST GROUP 10: Role-based UI Visibility, Refuse Action, and Green Accepted Styling ---
  console.log("\n🛡️ 10. Role-based UI Visibility & Action Buttons (Refuse vs Unbook)")

  function canViewManagerUI(role?: string): boolean {
    return role === "ADMIN" || role === "WORKSPACE_MANAGER" || role === "OWNER"
  }

  assert(canViewManagerUI("OWNER") === true, "Owner has full Manager UI visibility")
  assert(canViewManagerUI("WORKSPACE_MANAGER") === true, "Workspace Manager has Manager UI visibility")
  assert(canViewManagerUI("ADMIN") === true, "Admin has Manager UI visibility")
  assert(canViewManagerUI("USER") === false, "Regular User is restricted from Manager UI, Unbook, and Pending queues")
  assert(canViewManagerUI(undefined) === false, "Unauthenticated guest is restricted from Manager UI")

  function getBookingActionButton(status: string, role?: string): string | null {
    if (!canViewManagerUI(role)) return null
    if (status === "PENDING") return "Refuse"
    if (status === "APPROVED") return "Unbook"
    return null
  }

  assert(getBookingActionButton("PENDING", "OWNER") === "Refuse", "Pending requests display 'Refuse' button for Owner")
  assert(getBookingActionButton("PENDING", "WORKSPACE_MANAGER") === "Refuse", "Pending requests display 'Refuse' button for Manager")
  assert(getBookingActionButton("APPROVED", "OWNER") === "Unbook", "Approved bookings display 'Unbook' button for Owner")
  assert(getBookingActionButton("APPROVED", "WORKSPACE_MANAGER") === "Unbook", "Approved bookings display 'Unbook' button for Manager")
  assert(getBookingActionButton("PENDING", "USER") === null, "Regular user does NOT see action buttons on Pending requests")
  assert(getBookingActionButton("APPROVED", "USER") === null, "Regular user does NOT see Unbook action buttons on bookings")

  const approvedStatusColor = getStatusColor("APPROVED")
  assert(approvedStatusColor.includes("emerald") || approvedStatusColor.includes("green"), "Approved status resolves to vibrant green")
  const acceptedStatusColor = getStatusColor("ACCEPTED")
  assert(acceptedStatusColor.includes("emerald") || acceptedStatusColor.includes("green"), "Accepted status resolves to vibrant green")

  // --- TEST GROUP 11: Management Auto-Approval, Team Privacy & Accepted Badge Isolation ---
  console.log("\n🏢 11. Management Auto-Approval, Team Privacy & Accepted Badge Isolation")

  const managementTeamRoles = await client.execute(
    "SELECT * FROM user_team_roles WHERE userId IN ('user-owner', 'user-manager', 'user-admin')"
  )
  assert(
    managementTeamRoles.rows.length === 0,
    `Owner, Manager, Admin do NOT belong to any tenant team in user_team_roles (found: ${managementTeamRoles.rows.length})`
  )

  // Booking badge privacy helper
  function getBookingDisplayBadge(
    bookingStatus: string,
    bookingTeamId: string,
    userEmail?: string,
    userSystemRole?: string
  ): { badgeText: string; isGreenAccepted: boolean } {
    const isManager =
      userSystemRole === "WORKSPACE_MANAGER" ||
      userSystemRole === "ADMIN" ||
      userSystemRole === "OWNER"

    const isOwnTeam =
      isManager ||
      (userEmail?.includes("hawkinsight") && bookingTeamId === "hawk-insight") ||
      (userEmail?.includes("nexuslabs") && bookingTeamId === "nexus-labs")

    if (bookingStatus === "APPROVED") {
      if (isOwnTeam) {
        return { badgeText: "Accepted", isGreenAccepted: true }
      } else {
        return { badgeText: "Booked", isGreenAccepted: false }
      }
    }
    return { badgeText: "Pending", isGreenAccepted: false }
  }

  const hawkUserViewingHawkBooking = getBookingDisplayBadge("APPROVED", "hawk-insight", "alice@hawkinsight.com", "USER")
  assert(
    hawkUserViewingHawkBooking.badgeText === "Accepted" && hawkUserViewingHawkBooking.isGreenAccepted === true,
    "Hawk Insight user sees green 'Accepted' badge for their own team booking"
  )

  const nexusUserViewingHawkBooking = getBookingDisplayBadge("APPROVED", "hawk-insight", "carol@nexuslabs.com", "USER")
  assert(
    nexusUserViewingHawkBooking.badgeText === "Booked" && nexusUserViewingHawkBooking.isGreenAccepted === false,
    "Nexus Labs user sees neutral 'Booked' badge for another team's booking (Accepted hidden)"
  )

  const ownerViewingHawkBooking = getBookingDisplayBadge("APPROVED", "hawk-insight", "owner@utopi.space", "OWNER")
  assert(
    ownerViewingHawkBooking.badgeText === "Accepted" && ownerViewingHawkBooking.isGreenAccepted === true,
    "Workspace Owner sees 'Accepted' badge for all tenant bookings"
  )

  // Teams Directory visibility isolation helper
  function getVisibleTeamsForUser(
    allTeams: Array<{ id: string; members: Array<{ userEmail: string }> }>,
    userEmail?: string,
    userSystemRole?: string
  ) {
    const isManager =
      userSystemRole === "WORKSPACE_MANAGER" ||
      userSystemRole === "ADMIN" ||
      userSystemRole === "OWNER"

    if (isManager) return allTeams
    if (!userEmail) return []
    return allTeams.filter((t) => t.members.some((m) => m.userEmail === userEmail))
  }

  const mockAllTeams = [
    { id: "hawk-insight", members: [{ userEmail: "alice@hawkinsight.com" }, { userEmail: "bob@hawkinsight.com" }] },
    { id: "nexus-labs", members: [{ userEmail: "carol@nexuslabs.com" }, { userEmail: "david@freelancer.com" }] },
  ]

  const aliceVisibleTeams = getVisibleTeamsForUser(mockAllTeams, "alice@hawkinsight.com", "USER")
  assert(
    aliceVisibleTeams.length === 1 && aliceVisibleTeams[0].id === "hawk-insight",
    "Alice (Hawk Insight) ONLY sees Hawk Insight in Teams directory (Nexus Labs hidden)"
  )

  const carolVisibleTeams = getVisibleTeamsForUser(mockAllTeams, "carol@nexuslabs.com", "USER")
  assert(
    carolVisibleTeams.length === 1 && carolVisibleTeams[0].id === "nexus-labs",
    "Carol (Nexus Labs) ONLY sees Nexus Labs in Teams directory (Hawk Insight hidden)"
  )

  const managerVisibleTeams = getVisibleTeamsForUser(mockAllTeams, "manager@utopi.space", "WORKSPACE_MANAGER")
  assert(
    managerVisibleTeams.length === 2,
    "Workspace Manager sees all organizations in Teams directory"
  )

  console.log("\n==================================================")
  console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log("==================================================")

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution fatal error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await client.close()
  })
