import { NextRequest, NextResponse } from "next/server"
import { prisma, localPrisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function fetchWithFallback(client: typeof prisma, session: any) {
  const todayStr = new Date().toISOString().split("T")[0]
  const futureDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const isAuth = Boolean(session?.user?.email)

  const [rooms, bookings, dbUser, notifications] = await Promise.all([
    client.room.findMany({ orderBy: { name: "asc" } }),
    client.booking.findMany({
      where: {
        startTime: {
          gte: new Date(todayStr),
          lte: new Date(futureDateStr),
        },
      },
      include: { room: true, user: true, team: true },
      orderBy: { startTime: "asc" },
    }),
    isAuth && session?.user?.email
      ? client.user.findUnique({
          where: { email: session.user.email },
          include: { teamRoles: { include: { team: true } } },
        })
      : Promise.resolve(null),
    isAuth && session?.user?.id
      ? client.notification.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ])

  return { rooms, bookings, dbUser, notifications }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    let data: any
    try {
      // Primary DB query (Online / Cloud)
      data = await fetchWithFallback(prisma, session)
    } catch (err) {
      console.warn("Primary DB query failed or timed out, falling back to local SQLite:", err)
      data = await fetchWithFallback(localPrisma, session)
    }

    const { rooms, bookings, dbUser, notifications } = data
    const isManager =
      dbUser?.systemRole === "OWNER" ||
      dbUser?.systemRole === "WORKSPACE_MANAGER" ||
      dbUser?.systemRole === "ADMIN"
    const userTeamIds = dbUser?.teamRoles?.map((tr: any) => tr.teamId) || []

    const sanitizedBookings = (bookings || []).map((b: any) => {
      if (b.isIncognito) {
        const isTeamMember = userTeamIds.includes(b.teamId)
        if (isManager || isTeamMember) {
          return b
        } else {
          return {
            ...b,
            team: { ...b.team, name: "Reserved" },
            user: { ...b.user, name: "Booked", email: "hidden@utopi.space" },
            roleTitleUsed: "",
            projectOrCommitteeName: "",
            description: null,
            isIncognito: false,
          }
        }
      }
      return b
    })

    return NextResponse.json({
      rooms: rooms || [],
      bookings: sanitizedBookings,
      activeRoles: dbUser?.teamRoles || [],
      notifications: notifications || [],
    })
  } catch (error) {
    console.error("Error loading initial data:", error)
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 })
  }
}
