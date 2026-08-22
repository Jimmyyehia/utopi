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

    const now = new Date()

    // Run ALL database queries concurrently in a single parallel Promise.all batch!
    const [
      pendingBookings,
      approvedBookings,
      pendingTeams,
      pendingCustomRoles,
      totalRooms,
      totalBookingsToday,
      occupiedRoomsCount,
    ] = await Promise.all([
      // 1. ALL pending bookings
      prisma.booking.findMany({
        where: { status: "PENDING" },
        include: { room: true, user: true, team: true },
        orderBy: [{ createdAt: "asc" }],
      }),
      // 2. Approved bookings for the selected day
      prisma.booking.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { startTime: { gte: startOfDay, lte: endOfDay } },
            { endTime: { gte: startOfDay, lte: endOfDay } },
            { AND: [{ startTime: { lte: startOfDay } }, { endTime: { gte: endOfDay } }] },
          ],
        },
        include: { room: true, user: true, team: true },
      }),
      // 3. Pending team creation requests
      prisma.team.findMany({
        where: { status: "PENDING" },
        include: { members: { include: { user: true } } },
        orderBy: { name: "asc" },
      }),
      // 4. Pending custom role requests
      prisma.userTeamRole.findMany({
        where: { status: "PENDING" },
        include: { user: true, team: true },
        orderBy: { customRoleTitle: "asc" },
      }),
      // 5. Total rooms count
      prisma.room.count(),
      // 6. Total approved bookings today
      prisma.booking.count({
        where: {
          status: "APPROVED",
          startTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // 7. Occupied rooms right now
      prisma.room.count({
        where: {
          bookings: {
            some: {
              status: "APPROVED",
              startTime: { lte: now },
              endTime: { gte: now },
            },
          },
        },
      }),
    ])

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

    const stats = {
      totalRooms,
      totalBookingsToday,
      pendingApprovals: pendingBookings.length,
      pendingTeamsCount: pendingTeams.length,
      pendingCustomRolesCount: pendingCustomRoles.length,
      occupiedRooms: occupiedRoomsCount,
      revenueToday: 0,
    }

    return NextResponse.json(
      { approvalQueue, pendingTeams, pendingCustomRoles, stats },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}