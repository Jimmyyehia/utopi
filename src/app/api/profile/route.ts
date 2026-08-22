import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const normalizedEmail = session.user.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        teamRoles: {
          include: { team: true },
          orderBy: { customRoleTitle: "asc" },
        },
        bookings: {
          include: { room: true, team: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const pendingTeams = await prisma.team.findMany({
      where: {
        requestedBy: normalizedEmail,
        status: "PENDING",
      },
    })

    const activeRoles = user.teamRoles.filter((r) => r.status !== "PENDING" && r.status !== "REJECTED")
    const pendingRoles = user.teamRoles.filter((r) => r.status === "PENDING")

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        bannerImage: user.bannerImage,
        systemRole: user.systemRole,
        createdAt: user.createdAt,
      },
      activeRoles,
      pendingRoles,
      pendingBookings: user.bookings.filter((b) => b.status === "PENDING"),
      allBookings: user.bookings,
      pendingTeams,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { image, bannerImage } = body

    const normalizedEmail = session.user.email.toLowerCase().trim()
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User profile record not found." }, { status: 404 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(image !== undefined && { image }),
        ...(bannerImage !== undefined && { bannerImage }),
      },
    })

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        bannerImage: updatedUser.bannerImage,
        systemRole: updatedUser.systemRole,
      },
    })
  } catch (error: any) {
    console.error("Error updating profile visuals:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update profile visuals" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, committeeName, customRoleTitle, isCustomRole } = body

    if (!customRoleTitle) {
      return NextResponse.json({ error: "Role title is required." }, { status: 400 })
    }

    const normalizedEmail = session.user.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let targetTeamId = teamId
    if (!targetTeamId) {
      const firstTeam = await prisma.team.findFirst()
      targetTeamId = firstTeam?.id || "hawk-insight"
    }

    const isHigherRole =
      user.systemRole === "WORKSPACE_MANAGER" ||
      user.systemRole === "ADMIN" ||
      user.systemRole === "OWNER"

    const roleStatus = isHigherRole ? "APPROVED" : isCustomRole ? "PENDING" : "APPROVED"

    const newRole = await prisma.userTeamRole.create({
      data: {
        id: `utr-${Date.now()}`,
        userId: user.id,
        teamId: targetTeamId,
        committeeName: committeeName?.trim() || null,
        customRoleTitle: customRoleTitle.trim(),
        status: roleStatus,
      },
      include: { team: true },
    })

    if (isCustomRole && !isHigherRole) {
      const managers = await prisma.user.findMany({
        where: { systemRole: { in: ["WORKSPACE_MANAGER", "ADMIN", "OWNER"] } },
      })

      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            title: "Custom Role Review Required",
            message: `${user.name || user.email} requested custom role title "${customRoleTitle.trim()}" for manager review.`,
          },
        })
      }
    }

    return NextResponse.json({
      message: isCustomRole
        ? "Custom role requested! Pending manager approval."
        : "Role added to your profile successfully!",
      role: newRole,
    })
  } catch (error) {
    console.error("Error adding role to profile:", error)
    return NextResponse.json({ error: "Failed to add role" }, { status: 500 })
  }
}
