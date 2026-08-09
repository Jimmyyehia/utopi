import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const WORKSPACE_HOURS = {
  startHour: 9, // 9:00 AM
  endHour: 22,  // 10:00 PM
  startMinute: 0,
  endMinute: 0,
  intervalMinutes: 30, // 30-minute halves
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

export function formatDuration(start: Date | string, end: Date | string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime()
  const totalMinutes = Math.max(0, Math.round(diffMs / (60 * 1000)))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function generateBookingReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "UTP-"
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function calculatePriorityScore(roleTitle: string): number {
  const roleHierarchy: Record<string, number> = {
    owner: 100,
    founder: 100,
    head: 100,
    director: 95,
    lead: 90,
    manager: 85,
    senior: 70,
    coordinator: 60,
    guest: 10,
    intern: 5,
    member: 40,
  }

  const lowerRole = roleTitle.toLowerCase()
  for (const [key, value] of Object.entries(roleHierarchy)) {
    if (lowerRole.includes(key)) {
      return value
    }
  }
  return 30
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "AVAILABLE":
    case "APPROVED":
    case "ACCEPTED":
      return "text-emerald-700 bg-emerald-100 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
    case "OCCUPIED":
      return "text-emerald-700 bg-emerald-100 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
    case "PENDING":
      return "text-amber-800 bg-amber-100 border border-amber-200 dark:bg-amber-950 dark:text-amber-300"
    case "MAINTENANCE":
      return "text-gray-600 bg-gray-100"
    case "REJECTED":
    case "REFUSED":
      return "text-red-600 bg-red-100"
    case "CANCELLED":
      return "text-gray-600 bg-gray-100"
    default:
      return "text-muted-foreground bg-muted"
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "PAID":
      return "text-green-600 bg-green-100"
    case "CASH_PENDING":
      return "text-orange-600 bg-orange-100"
    default:
      return "text-muted-foreground bg-muted"
  }
}

export function timeSlotsForDay(
  date: Date,
  startHour = WORKSPACE_HOURS.startHour,
  endHour = WORKSPACE_HOURS.endHour,
  intervalMinutes = WORKSPACE_HOURS.intervalMinutes
): { start: Date; end: Date; label: string }[] {
  const slots: { start: Date; end: Date; label: string }[] = []
  const baseDate = new Date(date)

  const dayStart = new Date(baseDate)
  dayStart.setHours(startHour, 0, 0, 0)

  const dayEnd = new Date(baseDate)
  dayEnd.setHours(endHour, 0, 0, 0)

  let cursor = new Date(dayStart)
  while (cursor < dayEnd) {
    const slotStart = new Date(cursor)
    const slotEnd = new Date(cursor.getTime() + intervalMinutes * 60 * 1000)
    slots.push({
      start: slotStart,
      end: slotEnd,
      label: formatTime(slotStart),
    })
    cursor = slotEnd
  }

  return slots
}

export type TimelineBlock<T = any> =
  | {
      type: "booking"
      booking: T
      start: Date
      end: Date
      duration: string
      timeLabel: string
    }
  | {
      type: "available"
      start: Date
      end: Date
      duration: string
      timeLabel: string
    }

export function getConsolidatedDayTimeline<
  T extends { startTime: Date | string; endTime: Date | string; status?: string }
>(
  date: Date,
  bookings: T[],
  startHour = WORKSPACE_HOURS.startHour,
  endHour = WORKSPACE_HOURS.endHour
): TimelineBlock<T>[] {
  const blocks: TimelineBlock<T>[] = []
  const baseDate = new Date(date)

  const dayStart = new Date(baseDate)
  dayStart.setHours(startHour, 0, 0, 0)

  const dayEnd = new Date(baseDate)
  dayEnd.setHours(endHour, 0, 0, 0)

  // Filter and sort active/pending bookings for the day
  const sortedBookings = bookings
    .filter((b) => {
      const bStart = new Date(b.startTime)
      const bEnd = new Date(b.endTime)
      return (
        bStart < dayEnd &&
        bEnd > dayStart &&
        (!b.status || b.status === "APPROVED" || b.status === "PENDING")
      )
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  let cursor = new Date(dayStart)

  for (const booking of sortedBookings) {
    const bStart = new Date(booking.startTime)
    const bEnd = new Date(booking.endTime)

    // Clip to day bounds
    const effectiveStart = bStart < dayStart ? dayStart : bStart
    const effectiveEnd = bEnd > dayEnd ? dayEnd : bEnd

    // Combine any preceding available span into ONE continuous available block
    if (cursor < effectiveStart) {
      blocks.push({
        type: "available",
        start: new Date(cursor),
        end: new Date(effectiveStart),
        duration: formatDuration(cursor, effectiveStart),
        timeLabel: `${formatTime(cursor)} – ${formatTime(effectiveStart)}`,
      })
      cursor = new Date(effectiveStart)
    }

    // Now emit the single consolidated booking block
    blocks.push({
      type: "booking",
      booking,
      start: effectiveStart,
      end: effectiveEnd,
      duration: formatDuration(bStart, bEnd),
      timeLabel: `${formatTime(bStart)} – ${formatTime(bEnd)}`,
    })

    cursor = new Date(effectiveEnd)
  }

  // Combine any remaining available span until dayEnd into ONE continuous block
  if (cursor < dayEnd) {
    blocks.push({
      type: "available",
      start: new Date(cursor),
      end: new Date(dayEnd),
      duration: formatDuration(cursor, dayEnd),
      timeLabel: `${formatTime(cursor)} – ${formatTime(dayEnd)}`,
    })
  }

  return blocks
}

export function isTimeSlotBooked(
  bookings: { startTime: Date | string; endTime: Date | string }[],
  slotStart: Date,
  slotEnd: Date
): boolean {
  return bookings.some((booking) => {
    const bookingStart = new Date(booking.startTime)
    const bookingEnd = new Date(booking.endTime)
    return slotStart < bookingEnd && slotEnd > bookingStart
  })
}

export function getRoomStatusAtTime(
  roomId: string,
  bookings: { roomId: string; startTime: Date | string; endTime: Date | string; status: string }[],
  time: Date
): "available" | "occupied" | "pending" | "maintenance" {
  const roomBookings = bookings.filter((b) => b.roomId === roomId)
  const activeBooking = roomBookings.find(
    (b) => new Date(b.startTime) <= time && new Date(b.endTime) > time
  )

  if (!activeBooking) return "available"
  if (activeBooking.status === "APPROVED") return "occupied"
  if (activeBooking.status === "PENDING") return "pending"
  return "maintenance"
}