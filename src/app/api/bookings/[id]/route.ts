import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, generateBookingConfirmationEmail, generateBookingRejectionEmail } from "@/lib/email"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        user: true,
        team: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 })
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

    const { id } = await params
    const body = await request.json()
    const { status, rejectionReason, startTime, endTime, roomId, description, projectOrCommitteeName, teamId, userTeamRoleId, isIncognito } = body

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: true, room: true, team: true },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    const isManager =
      user?.systemRole === "WORKSPACE_MANAGER" ||
      user?.systemRole === "ADMIN" ||
      user?.systemRole === "OWNER"
    const isOwner = booking.userId === user?.id

    if (!isManager && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Requester can reschedule/edit their request in-place
    if (isOwner && !isManager) {
      if (booking.status !== "PENDING" && status && status !== "CANCELLED") {
        return NextResponse.json({ error: "You can only edit or cancel your own pending requests" }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status && isManager) updateData.status = status
    if (rejectionReason && isManager) updateData.rejectionReason = rejectionReason
    if (startTime) updateData.startTime = new Date(startTime)
    if (endTime) updateData.endTime = new Date(endTime)
    if (roomId) updateData.roomId = roomId
    if (description !== undefined) updateData.description = description
    if (projectOrCommitteeName) updateData.projectOrCommitteeName = projectOrCommitteeName
    if (teamId) updateData.teamId = teamId
    if (userTeamRoleId) updateData.userTeamRoleId = userTeamRoleId
    if (isIncognito !== undefined) updateData.isIncognito = Boolean(isIncognito)

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        room: true,
        user: true,
        team: true,
      },
    })

    // Create notification and send email asynchronously (non-blocking for fast queue responses)
    if (status === "APPROVED") {
      prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Approved",
          message: `Your booking for ${booking.room.name} (${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}) has been approved. Payment: Cash on arrival.`,
        },
      }).catch((e) => console.error("Notification create error:", e))

      if (booking.user.email) {
        const reference = `UTP-${booking.id.slice(-8).toUpperCase()}`
        const emailContent = generateBookingConfirmationEmail({
          userName: booking.user.name || "User",
          roomName: booking.room.name,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          projectName: booking.projectOrCommitteeName,
          reference,
        })
        sendEmail({
          to: booking.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        }).catch((e) => console.error("Email error:", e))
      }
    } else if (status === "REJECTED") {
      prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Rejected",
          message: `Your booking for ${booking.room.name} was rejected. Reason: ${rejectionReason || "No reason provided"}`,
        },
      }).catch((e) => console.error("Notification create error:", e))

      if (booking.user.email) {
        const emailContent = generateBookingRejectionEmail({
          userName: booking.user.name || "User",
          roomName: booking.room.name,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          projectName: booking.projectOrCommitteeName,
          reason: rejectionReason,
        })
        sendEmail({
          to: booking.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        }).catch((e) => console.error("Email error:", e))
      }
    } else if (status === "CANCELLED") {
      prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Cancelled",
          message: `Your booking for ${booking.room.name} has been cancelled.`,
        },
      }).catch((e) => console.error("Notification create error:", e))
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error("Error updating booking:", error)
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}

export { PUT as PATCH }

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
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: true, room: true },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    const isManager =
      user?.systemRole === "WORKSPACE_MANAGER" ||
      user?.systemRole === "ADMIN" ||
      user?.systemRole === "OWNER"
    const isOwner = booking.userId === user?.id

    if (!isManager && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Past Session Lock: Cannot delete or unbook sessions that have already passed
    if (new Date(booking.endTime) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot unbook or delete a session that has already passed." },
        { status: 400 }
      )
    }

    await prisma.booking.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting booking:", error)
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
  }
}