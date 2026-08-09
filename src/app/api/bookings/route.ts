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

    return NextResponse.json(bookings)
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
    } = body

    const isManagement =
      session.user.systemRole === "OWNER" ||
      session.user.systemRole === "WORKSPACE_MANAGER" ||
      session.user.systemRole === "ADMIN"

    // Validate required fields
    if (!roomId || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required room, start, or end time" }, { status: 400 })
    }

    if (!isManagement && (!teamId || !userTeamRoleId || !projectOrCommitteeName)) {
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

    if (isManagement) {
      roleTitleUsed =
        session.user.systemRole === "OWNER"
          ? "Workspace Owner"
          : session.user.systemRole === "WORKSPACE_MANAGER"
          ? "Workspace Manager"
          : "System Administrator"
      effectiveProjectName = projectOrCommitteeName || `${roleTitleUsed} Direct Reservation`
      priorityScore = 100

      // If management user has no tenant team, assign to first available organization
      if (!bookingTeamId) {
        const firstTeam = await prisma.team.findFirst()
        bookingTeamId = firstTeam?.id || "hawk-insight"
      }
    } else {
      // Verify user owns the role
      const userTeamRole = await prisma.userTeamRole.findUnique({
        where: { id: userTeamRoleId },
        include: { user: true, team: true },
      })

      if (!userTeamRole || userTeamRole.user.email !== session.user.email) {
        return NextResponse.json({ error: "Invalid role selection" }, { status: 403 })
      }

      bookingUserId = userTeamRole.userId
      bookingTeamId = userTeamRole.teamId
      roleTitleUsed = userTeamRole.customRoleTitle
      priorityScore = calculatePriorityScore(userTeamRole.customRoleTitle)
    }

    // Check for conflicting approved bookings (Management overrides non-management if clashing)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: "APPROVED",
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } },
            ],
          },
        ],
      },
    })

    if (conflictingBooking && !isManagement) {
      return NextResponse.json(
        { error: "Room is already booked for this time slot" },
        { status: 409 }
      )
    }

    // Create booking (Management bookings are AUTOMATICALLY APPROVED immediately)
    const booking = await prisma.booking.create({
      data: {
        roomId,
        userId: bookingUserId,
        teamId: bookingTeamId,
        roleTitleUsed,
        projectOrCommitteeName: effectiveProjectName,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        description,
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

    // Regular users: Send pending notifications.
    // Management users: AUTO-ACCEPTED without self-notifications.
    if (!isManagement) {
      await prisma.notification.create({
        data: {
          userId: bookingUserId,
          title: "Booking Submitted",
          message: `Your booking request for ${booking.room.name} (${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}) is pending approval.`,
        },
      })

      // Notify workspace managers
      const managers = await prisma.user.findMany({
        where: { systemRole: { in: ["WORKSPACE_MANAGER", "ADMIN", "OWNER"] } },
      })

      await prisma.notification.createMany({
        data: managers.map((manager) => ({
          userId: manager.id,
          title: "New Booking Request",
          message: `${booking.user.name} requested ${booking.room.name} for ${booking.projectOrCommitteeName} (${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}). Priority: ${priorityScore}`,
        })),
      })

      if (booking.user.email) {
        const emailContent = generateBookingPendingEmail({
          userName: booking.user.name || "User",
          roomName: booking.room.name,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
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