import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Role ID required" }, { status: 400 })
    }

    const normalizedEmail = session.user.email.toLowerCase().trim()
    const role = await prisma.userTeamRole.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    const isManager =
      session.user.systemRole === "WORKSPACE_MANAGER" ||
      session.user.systemRole === "ADMIN" ||
      session.user.systemRole === "OWNER"

    if (!isManager && role.user.email.toLowerCase().trim() !== normalizedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.userTeamRole.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Role removed successfully!" })
  } catch (error) {
    console.error("Error removing role:", error)
    return NextResponse.json({ error: "Failed to remove role" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isManager =
      session.user.systemRole === "WORKSPACE_MANAGER" ||
      session.user.systemRole === "ADMIN" ||
      session.user.systemRole === "OWNER"

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body // "APPROVED" | "REJECTED"

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    const updatedRole = await prisma.userTeamRole.update({
      where: { id },
      data: { status },
      include: { user: true, team: true },
    })

    // Notify user of decision
    await prisma.notification.create({
      data: {
        userId: updatedRole.userId,
        title: `Custom Role Request ${status === "APPROVED" ? "Approved" : "Refused"}`,
        message: `Your custom role request "${updatedRole.customRoleTitle}" for ${updatedRole.team.name} was ${status.toLowerCase()} by workspace management.`,
      },
    })

    return NextResponse.json({ message: `Role status updated to ${status}`, role: updatedRole })
  } catch (error) {
    console.error("Error updating role status:", error)
    return NextResponse.json({ error: "Failed to update role status" }, { status: 500 })
  }
}
