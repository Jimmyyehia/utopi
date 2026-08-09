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
      include: {
        teamRoles: {
          include: { team: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return teams user belongs to with full team object and flat properties
    const teams = user.teamRoles.map((tr) => ({
      id: tr.team.id,
      name: tr.team.name,
      description: tr.team.description,
      createdAt: tr.team.createdAt,
      updatedAt: tr.team.updatedAt,
      team: tr.team,
      userRole: tr.customRoleTitle,
      customRoleTitle: tr.customRoleTitle,
      committeeName: tr.committeeName,
      userTeamRoleId: tr.id,
    }))

    return NextResponse.json(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    const team = await prisma.team.create({
      data: { name, description },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}