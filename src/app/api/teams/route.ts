import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")

    const isManager =
      session?.user?.systemRole === "WORKSPACE_MANAGER" ||
      session?.user?.systemRole === "ADMIN" ||
      session?.user?.systemRole === "OWNER"

    // If manager requests all teams or pending queue
    if (isManager && statusFilter) {
      const teams = await prisma.team.findMany({
        where: statusFilter === "ALL" ? {} : { status: statusFilter },
        include: {
          members: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(teams)
    }

    if (!session?.user?.email) {
      // Unauthenticated public view: list approved teams only
      const approvedTeams = await prisma.team.findMany({
        where: { status: "APPROVED" },
        include: {
          members: {
            include: { user: true },
          },
        },
      })
      return NextResponse.json(approvedTeams)
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
      status: tr.team.status,
      requestedBy: tr.team.requestedBy,
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
    const { name, description, committeeName, customRoleTitle, otherRoles } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Team name is required." }, { status: 400 })
    }

    const isManager =
      session.user.systemRole === "WORKSPACE_MANAGER" ||
      session.user.systemRole === "ADMIN" ||
      session.user.systemRole === "OWNER"

    const generatedTeamId = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `team-${Date.now()}`

    // Management teams are auto-approved, member team requests require approval
    const teamStatus = isManager ? "APPROVED" : "PENDING"

    let combinedDescription = description?.trim() || ""
    if (otherRoles && otherRoles.trim()) {
      combinedDescription = combinedDescription
        ? `${combinedDescription}\n[Roles: ${otherRoles.trim()}]`
        : `[Roles: ${otherRoles.trim()}]`
    }

    const team = await prisma.team.create({
      data: {
        id: generatedTeamId,
        name: name.trim(),
        description: combinedDescription || null,
        status: teamStatus,
        requestedBy: session.user.email,
      },
    })

    // Get requesting user ID
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (user) {
      // Connect user to the team with their role title
      await prisma.userTeamRole.create({
        data: {
          id: `utr-${Date.now()}`,
          userId: user.id,
          teamId: team.id,
          committeeName: committeeName?.trim() || null,
          customRoleTitle: customRoleTitle?.trim() || "Founder / Lead",
        },
      })

      // Notify managers if pending approval
      if (teamStatus === "PENDING") {
        const managers = await prisma.user.findMany({
          where: { systemRole: { in: ["WORKSPACE_MANAGER", "ADMIN", "OWNER"] } },
        })

        for (const manager of managers) {
          await prisma.notification.create({
            data: {
              userId: manager.id,
              title: "New Team Creation Request",
              message: `${session.user.name || session.user.email} submitted a request to create organization "${team.name}".`,
            },
          })
        }
      }
    }

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}