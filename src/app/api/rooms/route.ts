import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        bookings: {
          where: {
            status: { in: ["APPROVED", "PENDING"] },
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: "asc" },
          take: 10,
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
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
    const { name, capacity, hasScreen, hasBalcony, hasAC, hasWhiteboard, hasPowerOutlets, description, svgPolygonCoords, svgX, svgY, color } = body

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

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}