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

    // Get current logged-in user
    const dbUser = session?.user?.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          include: { teamRoles: true },
        })
      : null

    const userTeamIds = new Set(dbUser?.teamRoles.map((r) => r.teamId) || [])

    // If manager requests all teams or pending queue
    if (isManager && statusFilter) {
      const teams = await prisma.team.findMany({
        where: statusFilter === "ALL" ? {} : { status: statusFilter },
        include: {
          members: {
            include: { user: true },
            orderBy: [{ customRoleTitle: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      })
      return NextResponse.json(teams)
    }

    // Fetch all approved teams arranged alphabetically
    const allApprovedTeams = await prisma.team.findMany({
      where: { status: "APPROVED" },
      include: {
        members: {
          include: { user: true },
          orderBy: [{ customRoleTitle: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    })

    // Filter and sanitize teams
    const sanitizedTeams = allApprovedTeams
      .filter((team) => {
        // Private teams are visible ONLY to team members and Workspace Management
        if (team.isPrivate && !isManager && !userTeamIds.has(team.id)) {
          return false
        }
        return true
      })
      .map((team) => {
        const isUserMember = userTeamIds.has(team.id) || isManager
        const sortedMembers = [...team.members].sort((a, b) =>
          (a.user?.name || "").localeCompare(b.user?.name || "")
        )
        return {
          id: team.id,
          name: team.name,
          description: team.description,
          status: team.status,
          isPrivate: Boolean(team.isPrivate),
          requestedBy: team.requestedBy,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          isMember: isUserMember,
          // Detailed member list AND total member count are visible ONLY to team members & managers
          members: isUserMember ? sortedMembers : [],
          memberCount: isUserMember ? team.members.length : null,
          userRole: isUserMember
            ? dbUser?.teamRoles.find((r) => r.teamId === team.id)?.customRoleTitle || "Member"
            : null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(sanitizedTeams)
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
    const { name, description, committeeName, customRoleTitle, otherRoles, isPrivate } = body

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
        isPrivate: Boolean(isPrivate),
        requestedBy: session.user.email,
      },
    })

    // For regular tenant users, connect requesting user to the team with their role title.
    // Workspace Management users create organizations for the workspace without being assigned as tenant members.
    if (!isManager) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (user) {
        await prisma.userTeamRole.create({
          data: {
            id: `utr-${Date.now()}`,
            userId: user.id,
            teamId: team.id,
            committeeName: committeeName?.trim() || null,
            customRoleTitle: customRoleTitle?.trim() || "Founder / Lead",
          },
        })
      }
    }

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

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}