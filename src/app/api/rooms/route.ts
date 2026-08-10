import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// In-memory cache for ultra-fast response times (<1ms)
let cachedRooms: any[] | null = null
let lastCacheTime = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minute

const STATIC_DEFAULT_ROOMS = [
  {
    id: "hall-1",
    name: "Main Hall",
    capacity: 30,
    hasScreen: true,
    hasBalcony: true,
    hasAC: true,
    hasWhiteboard: true,
    hasPowerOutlets: true,
    description:
      "Large conference hall with air conditioning, presentation screen/TV, magnetic whiteboard, ceiling fans, power sockets, and private room balcony access.",
    svgPolygonCoords: "M115,45 L385,45 L385,220 L115,220 Z",
    svgX: 250,
    svgY: 132,
    color: "#67C2B2",
  },
  {
    id: "hall-3",
    name: "Focus Room",
    capacity: 20,
    hasScreen: true,
    hasBalcony: false,
    hasAC: true,
    hasWhiteboard: true,
    hasPowerOutlets: true,
    description:
      "Collaboration and focus room with air conditioning, presentation screen/TV, whiteboard, ceiling fans, and power sockets.",
    svgPolygonCoords: "M397,45 L557,45 L557,220 L397,220 Z",
    svgX: 477,
    svgY: 132,
    color: "#5AB0A0",
  },
  {
    id: "hall-2",
    name: "Meeting Room",
    capacity: 10,
    hasScreen: false,
    hasBalcony: false,
    hasAC: false,
    hasWhiteboard: false,
    hasPowerOutlets: true,
    description: "Compact meeting room with ceiling fans and power sockets.",
    svgPolygonCoords: "M569,45 L714,45 L714,220 L569,220 Z",
    svgX: 641.5,
    svgY: 132,
    color: "#A286DB",
  },
  {
    id: "shared-area",
    name: "Shared Area",
    capacity: 50,
    hasScreen: false,
    hasBalcony: true,
    hasAC: false,
    hasWhiteboard: false,
    hasPowerOutlets: true,
    description:
      "Open co-working area for up to 50 people with natural airflow, double balcony access, ceiling fans, and power sockets throughout.",
    svgPolygonCoords: "M115,232 L275,232 L275,475 L115,475 Z",
    svgX: 195,
    svgY: 353,
    color: "#2D6A4F",
  },
]

export async function GET() {
  try {
    const now = Date.now()
    if (cachedRooms && now - lastCacheTime < CACHE_TTL_MS) {
      return NextResponse.json(cachedRooms, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      })
    }

    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
    })

    if (rooms && rooms.length > 0) {
      cachedRooms = rooms
      lastCacheTime = now
      return NextResponse.json(rooms, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      })
    }

    return NextResponse.json(STATIC_DEFAULT_ROOMS)
  } catch (error) {
    console.error("Error fetching rooms from database, using instant fallbacks:", error)
    return NextResponse.json(cachedRooms || STATIC_DEFAULT_ROOMS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (user?.systemRole !== "ADMIN" && user?.systemRole !== "WORKSPACE_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      capacity,
      hasScreen,
      hasBalcony,
      hasAC,
      hasWhiteboard,
      hasPowerOutlets,
      description,
      svgPolygonCoords,
      svgX,
      svgY,
      color,
    } = body

    const room = await prisma.room.create({
      data: {
        name,
        capacity,
        hasScreen: hasScreen ?? false,
        hasBalcony: hasBalcony ?? false,
        hasAC: hasAC ?? true,
        hasWhiteboard: hasWhiteboard ?? true,
        hasPowerOutlets: hasPowerOutlets ?? true,
        description,
        svgPolygonCoords,
        svgX: svgX ?? 0,
        svgY: svgY ?? 0,
        color: color ?? "#67C2B2",
      },
    })

    // Invalidate cache
    cachedRooms = null

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}