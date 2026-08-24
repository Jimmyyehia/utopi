import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getInitialData() {
  try {
    const session = await getServerSession(authOptions)
    const todayStr = new Date().toISOString().split("T")[0]
    const futureDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const isAuth = Boolean(session?.user?.email)

    const [rooms, bookings, dbUser, notifications, teams] = await Promise.all([
      prisma.room.findMany({ orderBy: { name: "asc" } }).catch(() => []),
      prisma.booking.findMany({
        where: {
          startTime: {
            gte: new Date(todayStr),
            lte: new Date(futureDateStr),
          },
        },
        include: { room: true, user: true, team: true },
        orderBy: { startTime: "asc" },
      }).catch(() => []),
      isAuth && session?.user?.email
        ? prisma.user.findUnique({
            where: { email: session.user.email },
            include: { teamRoles: { include: { team: true } } },
          }).catch(() => null)
        : Promise.resolve(null),
      isAuth && session?.user?.id
        ? prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 10,
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.team.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    ])

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

    return {
      rooms: rooms || [],
      bookings: JSON.parse(JSON.stringify(sanitizedBookings)),
      activeRoles: JSON.parse(JSON.stringify(dbUser?.teamRoles || [])),
      notifications: JSON.parse(JSON.stringify(notifications || [])),
      teams: JSON.parse(JSON.stringify(teams || [])),
    }
  } catch (error) {
    console.error("Error fetching initial server data:", error)
    return {
      rooms: [],
      bookings: [],
      activeRoles: [],
      notifications: [],
      teams: [],
    }
  }
}
