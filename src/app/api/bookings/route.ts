import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculatePriorityScore } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, generateBookingPendingEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")
    const userId = searchParams.get("userId")
    const teamId = searchParams.get("teamId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const session = await getServerSession(authOptions)
    let isManager = false
    let userTeamIds: string[] = []

    if (session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { teamRoles: true },
      })
      if (dbUser) {
        isManager =
          dbUser.systemRole === "OWNER" ||
          dbUser.systemRole === "WORKSPACE_MANAGER" ||
          dbUser.systemRole === "ADMIN"
        userTeamIds = dbUser.teamRoles.map((tr) => tr.teamId)
      }
    }

    const where: Record<string, unknown> = {}

    if (roomId) where.roomId = roomId
    if (userId) where.userId = userId
    if (teamId) where.teamId = teamId
    if (status) where.status = status
    if (startDate || endDate) {
      const startTimeFilter: Record<string, Date> = {}
      if (startDate) startTimeFilter.gte = new Date(startDate)
      if (endDate) startTimeFilter.lte = new Date(endDate)
      where.startTime = startTimeFilter
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: true,
        team: true,
      },
      orderBy: { startTime: "asc" },
    })

    // Mask private (incognito) bookings for non-team members & non-managers
    const sanitizedBookings = bookings.map((b) => {
      if (b.isIncognito) {
        const isTeamMember = userTeamIds.includes(b.teamId)
        if (isManager || isTeamMember) {
          // Managers & team members see full details + isIncognito: true (for Private Session hint badge)
          return b
        } else {
          // Other teams & non-members see ONLY "Reserved" / "Booked" without details or private badge
          return {
            ...b,
            team: {
              ...b.team,
              name: "Reserved",
            },
            user: {
              ...b.user,
              name: "Booked",
              email: "hidden@utopi.space",
            },
            roleTitleUsed: "",
            projectOrCommitteeName: "",
            description: null,
            isIncognito: false, // Mask flag so it looks like a standard busy slot
          }
        }
      }
      return b
    })

    return NextResponse.json(sanitizedBookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate Limiting Protection: Max 20 bookings per minute per user/IP
    const rateLimit = checkRateLimit(`booking:${session.user.email}`, { limit: 20, windowMs: 60 * 1000 })
    if (!rateLimit.isAllowed) {
      return NextResponse.json(
        { error: "Too many booking requests. Please wait a moment before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const {
      roomId,
      teamId,
      userTeamRoleId,
      projectOrCommitteeName,
      startTime,
      endTime,
      description,
      isIncognito,
    } = body

    const isManagement =
      session.user.systemRole === "OWNER" ||
      session.user.systemRole === "WORKSPACE_MANAGER" ||
      session.user.systemRole === "ADMIN"
    const isGuest = session.user.systemRole === "GUEST"

    // Validate required fields
    if (!roomId || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required room, start, or end time" }, { status: 400 })
    }

    if (!isManagement && !isGuest && (!teamId || !userTeamRoleId || !projectOrCommitteeName)) {
      return NextResponse.json({ error: "Missing required role, team, or project fields" }, { status: 400 })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 })
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time ('To') must be after start time ('From')" },
        { status: 400 }
      )
    }

    if (end <= now) {
      return NextResponse.json(
        { error: "Cannot create a booking in the past. The end time ('To') must be after the current time." },
        { status: 400 }
      )
    }

    // Enforce 30-day (1 month) advance booking window
    const maxAllowedDate = new Date()
    maxAllowedDate.setDate(maxAllowedDate.getDate() + 30)
    maxAllowedDate.setHours(23, 59, 59, 999)

    if (start > maxAllowedDate) {
      return NextResponse.json(
        { error: "Bookings can only be scheduled up to 1 month (30 days) in advance." },
        { status: 400 }
      )
    }

    let bookingUserId = session.user.id
    let bookingTeamId = teamId
    let roleTitleUsed = "Member"
    let priorityScore = 30
    let effectiveProjectName = projectOrCommitteeName || "Workspace Session"

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 })
    }
    bookingUserId = dbUser.id

    // Guest Account Restriction: Can ONLY book Shared Area when free from team events
    if (isGuest) {
      if (roomId !== "shared-area") {
        return NextResponse.json(
          { error: "Guest accounts can only request a spot in the Shared Area." },
          { status: 403 }
        )
      }

      // Check if Shared Area is reserved for a team event at this time
      const conflictingSharedBooking = await prisma.booking.findFirst({
        where: {
          roomId: "shared-area",
          status: "APPROVED",
          OR: [
            { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
            { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
            { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] },
          ],
        },
      })

      if (conflictingSharedBooking) {
        return NextResponse.json(
          { error: "The Shared Area is currently reserved for a team event during this time slot." },
          { status: 409 }
        )
      }

      roleTitleUsed = "Guest Contributor"
      priorityScore = 10
      effectiveProjectName = projectOrCommitteeName || "Coworking Reservation"

      if (!bookingTeamId) {
        let guestTeam = await prisma.team.findFirst({ where: { name: "Guest Coworkers" } })
        if (!guestTeam) {
          guestTeam = await prisma.team.create({
            data: {
              name: "Guest Coworkers",
              description: "Individual guests and independent contributors using the Shared Area",
            },
          })
        }
        bookingTeamId = guestTeam.id
      }
    } else if (isManagement) {
      roleTitleUsed =
        session.user.systemRole === "OWNER"
          ? "Workspace Owner"
          : session.user.systemRole === "WORKSPACE_MANAGER"
          ? "Workspace Manager"
          : "System Administrator"
      effectiveProjectName = projectOrCommitteeName || `${roleTitleUsed} Direct Reservation`
      priorityScore = 100

      if (!bookingTeamId) {
        const firstTeam = await prisma.team.findFirst()
        bookingTeamId = firstTeam?.id || "hawk-insight"
      }
    } else {
      // Verify user owns the role and belongs to the selected team
      const userTeamRole = await prisma.userTeamRole.findUnique({
        where: { id: userTeamRoleId },
        include: { user: true, team: true },
      })

      if (!userTeamRole || userTeamRole.user.email.toLowerCase().trim() !== session.user.email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Invalid role selection. You must belong to the team to create a booking for it." },
          { status: 403 }
        )
      }

      if (teamId && userTeamRole.teamId !== teamId) {
        return NextResponse.json(
          { error: "You must belong to the selected team to create a room reservation for it." },
          { status: 403 }
        )
      }

      if (userTeamRole.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Your team role is pending approval. You must have an approved team role to create a booking." },
          { status: 403 }
        )
      }

      if (userTeamRole.customRoleTitle.trim().toLowerCase() === "member") {
        return NextResponse.json(
          { error: "Regular team members do not have authority to create room bookings. Booking authority is reserved for team officers (President, Vice President, Head, Vice Head, Project Manager, Vice Project Manager) or workspace management." },
          { status: 403 }
        )
      }

      bookingUserId = userTeamRole.userId
      bookingTeamId = userTeamRole.teamId
      roleTitleUsed = userTeamRole.customRoleTitle
      priorityScore = calculatePriorityScore(userTeamRole.customRoleTitle)
    }

    // Check for conflicting approved bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: "APPROVED",
        OR: [
          { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
          { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
          { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] },
        ],
      },
    })

    if (conflictingBooking && !isManagement) {
      return NextResponse.json(
        { error: "Room is already booked for this time slot" },
        { status: 409 }
      )
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        roomId,
        userId: bookingUserId,
        teamId: bookingTeamId,
        roleTitleUsed,
        projectOrCommitteeName: effectiveProjectName,
        startTime: start,
        endTime: end,
        description,
        isIncognito: Boolean(isIncognito),
        status: isManagement ? "APPROVED" : "PENDING",
        paymentStatus: isManagement ? "PAID" : "CASH_PENDING",
        priorityScore,
      },
      include: {
        room: true,
        user: true,
        team: true,
      },
    })

    if (!isManagement) {
      await prisma.notification.create({
        data: {
          userId: bookingUserId,
          title: "Booking Submitted",
          message: `Your booking request for ${booking.room.name} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}) is pending approval.`,
        },
      })

      const managers = await prisma.user.findMany({
        where: { systemRole: { in: ["WORKSPACE_MANAGER", "ADMIN", "OWNER"] } },
      })

      await prisma.notification.createMany({
        data: managers.map((manager) => ({
          userId: manager.id,
          title: "New Booking Request",
          message: `${booking.user.name} requested ${booking.room.name} for ${booking.projectOrCommitteeName} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}).`,
        })),
      })

      if (booking.user.email) {
        const emailContent = generateBookingPendingEmail({
          userName: booking.user.name || "User",
          roomName: booking.room.name,
          startTime: start,
          endTime: end,
          projectName: booking.projectOrCommitteeName,
        })
        await sendEmail({
          to: booking.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      }
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}