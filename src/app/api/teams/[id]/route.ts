import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, generateTeamApprovedEmail, generateTeamRejectedEmail } from "@/lib/email"

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
      return NextResponse.json(
        { error: "Forbidden: Only workspace managers, owners, and admins can approve/reject team requests." },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, rejectionReason, name, description } = body

    const existingTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
      },
    })

    if (!existingTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
    })

    // Find requester user
    let requesterUser = null
    if (existingTeam.requestedBy) {
      requesterUser = await prisma.user.findUnique({
        where: { email: existingTeam.requestedBy },
      })
    } else if (existingTeam.members.length > 0) {
      requesterUser = existingTeam.members[0].user
    }

    if (requesterUser) {
      if (status === "APPROVED") {
        // Send In-App Notification
        await prisma.notification.create({
          data: {
            userId: requesterUser.id,
            title: "Team Approved! 🎉",
            message: `Your request to establish organization "${updatedTeam.name}" has been approved. You can now book workspace facilities!`,
          },
        })

        // Send Email Notification to the Requester
        try {
          const emailContent = generateTeamApprovedEmail({
            userName: requesterUser.name || requesterUser.email,
            teamName: updatedTeam.name,
            approvedBy: session.user.name || "Workspace Management",
          })
          await sendEmail({
            to: requesterUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          })
        } catch (emailErr) {
          console.error("Failed to send team approved email:", emailErr)
        }
      } else if (status === "REJECTED") {
        // Send In-App Notification
        await prisma.notification.create({
          data: {
            userId: requesterUser.id,
            title: "Team Request Declined",
            message: `Your request for team "${updatedTeam.name}" was declined. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
          },
        })

        // Send Email Notification to the Requester
        try {
          const emailContent = generateTeamRejectedEmail({
            userName: requesterUser.name || requesterUser.email,
            teamName: updatedTeam.name,
            reason: rejectionReason || "Does not meet workspace tenant criteria.",
          })
          await sendEmail({
            to: requesterUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          })
        } catch (emailErr) {
          console.error("Failed to send team rejection email:", emailErr)
        }
      }
    }

    return NextResponse.json(updatedTeam)
  } catch (error) {
    console.error("Error updating team request:", error)
    return NextResponse.json({ error: "Failed to update team request" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const isManager =
      session?.user?.systemRole === "WORKSPACE_MANAGER" ||
      session?.user?.systemRole === "ADMIN" ||
      session?.user?.systemRole === "OWNER"

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    await prisma.team.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
