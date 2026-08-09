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
    const { status, rejectionReason, startTime, endTime } = body

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

    // Owners can only cancel their own bookings
    if (isOwner && !isManager && status && status !== "CANCELLED") {
      return NextResponse.json({ error: "You can only cancel your own bookings" }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (rejectionReason) updateData.rejectionReason = rejectionReason
    if (startTime) updateData.startTime = new Date(startTime)
    if (endTime) updateData.endTime = new Date(endTime)

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        room: true,
        user: true,
        team: true,
      },
    })

    // Create notification and send email for the booking owner
    if (status === "APPROVED") {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Approved",
          message: `Your booking for ${booking.room.name} (${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}) has been approved. Payment: Cash on arrival.`,
        },
      })

      // Send confirmation email
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
        await sendEmail({
          to: booking.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      }
    } else if (status === "REJECTED") {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Rejected",
          message: `Your booking for ${booking.room.name} was rejected. Reason: ${rejectionReason || "No reason provided"}`,
        },
      })

      // Send rejection email
      if (booking.user.email) {
        const emailContent = generateBookingRejectionEmail({
          userName: booking.user.name || "User",
          roomName: booking.room.name,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          projectName: booking.projectOrCommitteeName,
          reason: rejectionReason,
        })
        await sendEmail({
          to: booking.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      }
    } else if (status === "CANCELLED") {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Cancelled",
          message: `Your booking for ${booking.room.name} has been cancelled.`,
        },
      })
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error("Error updating booking:", error)
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}

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

    await prisma.booking.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting booking:", error)
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
  }
}