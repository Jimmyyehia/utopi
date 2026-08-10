import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (
      !user ||
      (user.systemRole !== "WORKSPACE_MANAGER" &&
        user.systemRole !== "ADMIN" &&
        user.systemRole !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Get pending bookings with conflicts
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        room: true,
        user: true,
        team: true,
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
    })

    // Get all approved bookings for the day to check conflicts
    const approvedBookings = await prisma.booking.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { startTime: { gte: startOfDay, lte: endOfDay } },
          { endTime: { gte: startOfDay, lte: endOfDay } },
          { AND: [{ startTime: { lte: startOfDay } }, { endTime: { gte: endOfDay } }] },
        ],
      },
      include: { room: true, user: true, team: true },
    })

    // Group pending bookings by room and time to find conflicts
    const approvalQueue = pendingBookings.map((booking) => {
      const conflictingBookings = approvedBookings.filter(
        (ab) =>
          ab.roomId === booking.roomId &&
          new Date(ab.startTime) < new Date(booking.endTime) &&
          new Date(ab.endTime) > new Date(booking.startTime)
      )

      const conflictingPending = pendingBookings.filter(
        (pb) =>
          pb.id !== booking.id &&
          pb.roomId === booking.roomId &&
          new Date(pb.startTime) < new Date(booking.endTime) &&
          new Date(pb.endTime) > new Date(booking.startTime)
      )

      return {
        ...booking,
        conflictingApproved: conflictingBookings,
        conflictingPending,
        hasConflict: conflictingBookings.length > 0 || conflictingPending.length > 0,
      }
    })

    // Get pending team creation requests
    const pendingTeams = await prisma.team.findMany({
      where: { status: "PENDING" },
      include: {
        members: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Stats
    const stats = {
      totalRooms: await prisma.room.count(),
      totalBookingsToday: await prisma.booking.count({
        where: {
          status: "APPROVED",
          startTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      pendingApprovals: pendingBookings.length,
      pendingTeamsCount: pendingTeams.length,
      occupiedRooms: await prisma.room.count({
        where: {
          bookings: {
            some: {
              status: "APPROVED",
              startTime: { lte: new Date() },
              endTime: { gte: new Date() },
            },
          },
        },
      }),
      revenueToday: 0, // Cash on arrival - would need desk verification
    }

    return NextResponse.json({ approvalQueue, pendingTeams, stats })
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}