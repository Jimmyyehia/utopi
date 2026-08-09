"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { cn, formatDuration, formatDate, formatTime, timeSlotsForDay, getConsolidatedDayTimeline } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Users,
  Monitor,
  Snowflake,
  TreePine,
  PlugZap,
  LayoutDashboard,
  ChevronLeft,
  MapPin,
  Search,
  Check,
  Coffee,
  Fan,
  AppWindow,
  Sparkles,
  Clock,
  Briefcase,
  Trash2,
  XCircle,
  CheckCircle2,
} from "lucide-react"
import type { FloorPlanRoom, BookingWithRelations, TooltipData } from "@/types"
import { useRealtimeRoomStatus } from "@/hooks/useSocket"

interface FloorPlanProps {
  rooms: FloorPlanRoom[]
  selectedRoom: FloorPlanRoom | null
  onRoomSelect: (room: FloorPlanRoom | null) => void
  bookings: BookingWithRelations[]
  currentTime: Date
}

// Geometric definitions for rounded rooms:
// Focus Room (20 Max - 160px width) | Meeting Room (10 Max - 145px width) | Kitchen (179px width with 56px hallway door opening)
const ROOM_BOUNDS: Record<string, { x: number; y: number; width: number; height: number; rx: number; badgeWidth: number }> = {
  "hall-1": { x: 115, y: 45, width: 270, height: 175, rx: 16, badgeWidth: 140 }, // Main Hall (30 Max)
  "hall-3": { x: 397, y: 45, width: 160, height: 175, rx: 16, badgeWidth: 130 }, // Focus Room (20 Max - Screen, Whiteboard, AC)
  "hall-2": { x: 569, y: 45, width: 145, height: 175, rx: 16, badgeWidth: 120 }, // Meeting Room (10 Max)
  "shared-area": { x: 115, y: 232, width: 160, height: 243, rx: 16, badgeWidth: 130 }, // Shared Area (50 Max)
}

function RoomShape({
  room,
  isSelected,
  isHovered,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  room: FloorPlanRoom
  isSelected: boolean
  isHovered: boolean
  isDimmed: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const bounds = ROOM_BOUNDS[room.id] || { x: 115, y: 45, width: 270, height: 175, rx: 16, badgeWidth: 140 }

  return (
    <motion.rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      rx={bounds.rx}
      ry={bounds.rx}
      fill={`url(#grad-${room.id})`}
      fillOpacity={isDimmed ? 0.2 : isSelected ? 1 : isHovered ? 0.92 : 0.8}
      stroke="#1A1A1A"
      strokeWidth={isSelected ? 3 : 2}
      strokeOpacity={isDimmed ? 0.2 : isSelected ? 1 : 0.75}
      strokeLinejoin="round"
      strokeLinecap="round"
      filter={isSelected ? "url(#glow-selected)" : isHovered ? "url(#subtle-lift)" : "none"}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      whileHover={{ scale: isDimmed ? 1 : 1.004 }}
      whileTap={{ scale: 0.988 }}
      animate={{
        fillOpacity: isDimmed ? 0.2 : isSelected ? 1 : 0.8,
        strokeWidth: isSelected ? 3 : 2,
      }}
      transition={{ duration: 0.25 }}
    />
  )
}

function StatusIndicator({ status }: { status: FloorPlanRoom["status"] }) {
  const config = {
    available: { label: "Available", variant: "available" as const, dotColor: "bg-emerald-500" },
    occupied: { label: "Occupied", variant: "occupied" as const, dotColor: "bg-rose-500" },
    pending: { label: "Pending", variant: "pending" as const, dotColor: "bg-amber-500" },
    maintenance: { label: "Maintenance", variant: "maintenance" as const, dotColor: "bg-slate-500" },
  }
  
  const cfg = config[status] || config.available
  return (
    <Badge variant={cfg.variant} className="gap-1.5 shadow-xs text-xs font-semibold px-2.5 py-0.5">
      <span className={cn("w-2 h-2 rounded-full animate-pulse", cfg.dotColor)} />
      <span>{cfg.label}</span>
    </Badge>
  )
}

function AmenityIcon({ icon: Icon, label, has }: { icon: React.ComponentType<{ className?: string }>; label: string; has: boolean }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", has ? "text-foreground" : "text-muted-foreground/45")}>
      <Icon className={cn("h-3.5 w-3.5", has ? "text-primary" : "text-muted-foreground/35")} aria-hidden="true" />
      <span className={cn(!has && "line-through opacity-70")}>{label}</span>
    </span>
  )
}

function RoomTooltip({ room, nextAvailableSlot, currentBooking }: TooltipData & { room: FloorPlanRoom }) {
  if (!room) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="glass-strong rounded-2xl p-4 w-76 shadow-2xl border border-border/80 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="font-extrabold text-foreground text-base tracking-tight">{room.name}</h4>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Capacity: {room.capacity} people</p>
        </div>
        <StatusIndicator status={room.status} />
      </div>

      <Separator className="my-2.5 bg-border/60" />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <AmenityIcon icon={Users} label={`${room.capacity} Max`} has={true} />
        <AmenityIcon icon={Monitor} label="Screen/TV" has={room.hasScreen} />
        <AmenityIcon icon={TreePine} label="Balcony" has={room.hasBalcony} />
        <AmenityIcon icon={Snowflake} label="Air Cond." has={room.hasAC} />
        <AmenityIcon icon={LayoutDashboard} label="Whiteboard" has={room.hasWhiteboard} />
        <AmenityIcon icon={PlugZap} label="Power Sockets" has={true} />
        <AmenityIcon icon={Fan} label="Ceiling Fans" has={true} />
      </div>

      {currentBooking && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 mb-2">
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Currently Booked</p>
          <p className="text-xs font-bold text-foreground mt-0.5">{currentBooking.teamName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{currentBooking.description}</p>
          <p className="text-[10px] font-medium text-muted-foreground mt-1">Until {currentBooking.endTime}</p>
        </div>
      )}

      {nextAvailableSlot && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Next Available Slot</p>
          <p className="text-xs font-semibold text-primary mt-0.5">{nextAvailableSlot}</p>
        </div>
      )}

      {!currentBooking && !nextAvailableSlot && room.status === "available" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Available Now</p>
        </div>
      )}
    </motion.div>
  )
}

function RoomSidebar({
  room,
  bookings,
  currentTime,
  onClose,
  onBook,
}: {
  room: FloorPlanRoom | null
  bookings: BookingWithRelations[]
  currentTime: Date
  onClose: () => void
  onBook: () => void
}) {
  const { data: session } = useSession()
  const [unbookingId, setUnbookingId] = useState<string | null>(null)
  const [selectedViewDate, setSelectedViewDate] = useState<Date>(currentTime)

  if (!room) return null

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const handleUnbook = async (bookingId: string) => {
    if (!confirm("Are you sure you want to unbook and release this reservation?")) return
    setUnbookingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert("Failed to unbook reservation.")
      }
    } catch (err) {
      console.error("Error unbooking:", err)
      alert("Error unbooking reservation.")
    } finally {
      setUnbookingId(null)
    }
  }

  const handleRefuse = async (bookingId: string) => {
    if (!confirm("Are you sure you want to refuse and reject this pending request?")) return
    setUnbookingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason: "Refused by workspace manager" }),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert("Failed to refuse pending request.")
      }
    } catch (err) {
      console.error("Error refusing request:", err)
      alert("Error refusing pending request.")
    } finally {
      setUnbookingId(null)
    }
  }

  const roomBookings = bookings.filter((b) => b.roomId === room.id)
  
  // Bookings for the selected view date:
  // ONLY Admin, Manager, and Owner can see PENDING requests. Regular users ONLY see APPROVED bookings.
  const viewDateStr = selectedViewDate.toISOString().split("T")[0]
  const dayBookings = roomBookings.filter((b) => {
    const bDate = new Date(b.startTime).toISOString().split("T")[0]
    if (bDate !== viewDateStr) return false
    return isManager ? (b.status === "APPROVED" || b.status === "PENDING") : b.status === "APPROVED"
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // Upcoming bookings in future days:
  const futureBookings = roomBookings.filter((b) => {
    const bDate = new Date(b.startTime).toISOString().split("T")[0]
    if (bDate <= viewDateStr) return false
    return isManager ? (b.status === "APPROVED" || b.status === "PENDING") : b.status === "APPROVED"
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // Consolidated timeline: combined available times and combined bookings!
  const timelineBlocks = getConsolidatedDayTimeline(selectedViewDate, dayBookings, 9, 22)

  const isToday =
    selectedViewDate.toISOString().split("T")[0] === currentTime.toISOString().split("T")[0]

  const goToDay = (offset: number) => {
    const next = new Date(selectedViewDate)
    next.setDate(next.getDate() + offset)
    setSelectedViewDate(next)
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 320 }}
      className="sidebar-panel flex flex-col shadow-2xl border-l border-border bg-card"
    >
      {/* Mobile Top Drag Indicator */}
      <div className="sm:hidden w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mt-2.5 -mb-1" />

      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="font-extrabold text-foreground text-base sm:text-lg tracking-tight">{room.name}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">Capacity: {room.capacity} Max • 9 AM – 10 PM</p>
          </div>
        </div>
        <StatusIndicator status={room.status} />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Amenities Grid */}
          <div>
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Features & Amenities
            </h4>
            <div className="grid grid-cols-2 gap-2.5 bg-muted/40 p-4 rounded-2xl border border-border">
              <AmenityIcon icon={Users} label={`Capacity: ${room.capacity} Max`} has={true} />
              <AmenityIcon icon={Monitor} label="Screen/TV" has={room.hasScreen} />
              <AmenityIcon icon={TreePine} label="Balcony Access" has={room.hasBalcony} />
              <AmenityIcon icon={Snowflake} label="Air Conditioning" has={room.hasAC} />
              <AmenityIcon icon={LayoutDashboard} label="Whiteboard" has={room.hasWhiteboard} />
              <AmenityIcon icon={PlugZap} label="Power Sockets" has={true} />
              <AmenityIcon icon={Fan} label="Ceiling Fans" has={true} />
            </div>
          </div>

          <Separator />

          {/* Date Navigator Header */}
          <div className="p-3 bg-muted/30 rounded-2xl border border-border flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => goToDay(-1)}
              className="h-8 w-8 p-0 rounded-lg"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
              <input
                type="date"
                value={selectedViewDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split("-").map(Number)
                    const nd = new Date(selectedViewDate)
                    nd.setFullYear(y, m - 1, d)
                    setSelectedViewDate(nd)
                  }
                }}
                className="bg-transparent border-none outline-none text-xs font-bold text-foreground cursor-pointer"
              />
              {isToday && (
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                  Today
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isToday && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedViewDate(currentTime)}
                  className="h-7 text-[10px] px-2 rounded-lg"
                >
                  Today
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => goToDay(1)}
                className="h-8 w-8 p-0 rounded-lg"
                title="Next Day"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>

          {/* Active Reservations Summary Cards */}
          {dayBookings.length > 0 && (
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                {isManager ? `Reservations & Requests (${dayBookings.length})` : `Reserved on this Date (${dayBookings.length})`}
              </h4>
              <div className="space-y-2.5">
                {dayBookings.map((res) => {
                  const duration = formatDuration(res.startTime, res.endTime)
                  const isApproved = res.status === "APPROVED"
                  const isPending = res.status === "PENDING"

                  return (
                    <div
                      key={res.id}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all text-xs space-y-2 shadow-xs",
                        isApproved
                          ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                          : "bg-amber-500/10 border-amber-500/30 text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-xs">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {formatTime(res.startTime)} – {formatTime(res.endTime)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] py-0 px-1.5 font-mono",
                              isApproved && "bg-card text-emerald-700 border-emerald-300"
                            )}
                          >
                            {duration}
                          </Badge>
                        </div>
                        {isApproved ? (
                          <Badge
                            variant="approved"
                            className="text-[9px] py-0.5 px-2 font-bold bg-emerald-600 text-white shadow-xs"
                          >
                            Accepted
                          </Badge>
                        ) : (
                          <Badge
                            variant="pending"
                            className="text-[9px] py-0.5 px-2 font-bold"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-foreground truncate">{res.team.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {res.description || res.projectOrCommitteeName || "Scheduled Session"}
                          </p>
                        </div>

                        {/* Manager & Admin action buttons: Refuse for Pending, Unbook for Approved */}
                        {isManager && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isPending ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={unbookingId === res.id}
                                onClick={() => handleRefuse(res.id)}
                                className="h-7 text-[10px] gap-1 px-2.5 rounded-lg font-bold flex-shrink-0 shadow-xs bg-red-600 hover:bg-red-700 text-white"
                                title="Refuse pending request"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>{unbookingId === res.id ? "Refusing..." : "Refuse"}</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={unbookingId === res.id}
                                onClick={() => handleUnbook(res.id)}
                                className="h-7 text-[10px] gap-1 px-2.5 rounded-lg font-bold flex-shrink-0 shadow-xs"
                                title="Unbook and release space"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{unbookingId === res.id ? "Unbooking..." : "Unbook"}</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Consolidated Timeline (Combined Available Spans & Bookings) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Schedule & Availability
              </h4>
              <span className="text-[10px] text-muted-foreground font-mono font-medium">9:00 AM – 10:00 PM</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {timelineBlocks.map((block, index) => {
                if (block.type === "booking") {
                  const booking = block.booking
                  const isApproved = booking.status === "APPROVED"
                  const isPending = booking.status === "PENDING"

                  const isOwnBooking =
                    isManager ||
                    (session?.user?.email &&
                      ((session?.user?.email.includes("hawkinsight") && (booking.team?.name?.includes("Hawk") || booking.teamId === "hawk-insight")) ||
                       (session?.user?.email.includes("nexuslabs") && (booking.team?.name?.includes("Nexus") || booking.teamId === "nexus-labs")) ||
                       (session?.user?.email.includes("freelancer") && (booking.team?.name?.includes("Nexus") || booking.teamId === "nexus-labs")) ||
                       booking.user?.email === session?.user?.email ||
                       booking.userId === session?.user?.id))

                  return (
                    <div
                      key={booking.id || index}
                      className={cn(
                        "p-3 rounded-2xl border transition-all text-xs shadow-xs",
                        isApproved
                          ? isOwnBooking
                            ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                            : "bg-muted/40 border-border/70 text-foreground"
                          : "bg-amber-500/10 border-amber-500/30 text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-[11px]">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>{block.timeLabel}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] py-0 px-1 font-mono",
                              isApproved && isOwnBooking && "bg-card text-emerald-700 border-emerald-300"
                            )}
                          >
                            {block.duration}
                          </Badge>
                        </div>
                        {isApproved ? (
                          isOwnBooking ? (
                            <Badge
                              variant="approved"
                              className="text-[9px] py-0.5 px-2 font-bold bg-emerald-600 text-white shadow-xs"
                            >
                              Accepted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0.5 px-2 font-semibold bg-muted/60 text-muted-foreground border-border"
                            >
                              Booked
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="pending"
                            className="text-[9px] py-0.5 px-2 font-bold"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-foreground truncate text-xs">
                            {booking.team.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {booking.description || booking.projectOrCommitteeName || "Session"}
                          </p>
                        </div>

                        {/* Manager & Admin action buttons: Refuse for Pending, Unbook for Approved */}
                        {isManager && (
                          <div className="flex items-center gap-1">
                            {isPending ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={unbookingId === booking.id}
                                onClick={() => handleRefuse(booking.id)}
                                className="h-6 text-[10px] gap-1 px-2 rounded-lg font-bold flex-shrink-0 shadow-xs bg-red-600 hover:bg-red-700 text-white"
                                title="Refuse pending request"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>{unbookingId === booking.id ? "Refusing..." : "Refuse"}</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={unbookingId === booking.id}
                                onClick={() => handleUnbook(booking.id)}
                                className="h-6 text-[10px] gap-1 px-2 rounded-lg font-bold flex-shrink-0 shadow-xs"
                                title="Unbook and release space"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{unbookingId === booking.id ? "Unbooking..." : "Unbook"}</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                // Combined Available Block
                return (
                  <div
                    key={block.start.toISOString()}
                    className="p-3 rounded-2xl border bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-xs transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-foreground">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{block.timeLabel}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono bg-card text-emerald-700 border-emerald-300">
                          {block.duration} Free
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium truncate">
                        Available for reservations
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-booking", {
                            detail: { id: room.id, date: block.start },
                          })
                        )
                      }}
                      className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex-shrink-0 gap-1 px-3 shadow-xs"
                    >
                      + Book
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Bookings in Future Days */}
          {futureBookings.length > 0 && (
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Days ({futureBookings.length})
              </h4>
              <div className="space-y-2">
                {futureBookings.slice(0, 4).map((fb) => (
                  <div
                    key={fb.id}
                    className="p-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{fb.team.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(fb.startTime)} • {formatTime(fb.startTime)} – {formatTime(fb.endTime)}
                      </p>
                    </div>
                    <Badge variant={fb.status === "APPROVED" ? "occupied" : "pending"} className="text-[9px] py-0 px-1.5">
                      {fb.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {room.description && (
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 text-muted-foreground">About this Space</h4>
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border">
                {room.description}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-card">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 h-auto gap-2 text-sm shadow-md rounded-xl transition-all"
          onClick={onBook}
        >
          <MapPin className="h-4 w-4" />
          Book {room.name}
        </Button>
      </div>
    </motion.div>
  )
}

export function FloorPlan({
  rooms,
  selectedRoom,
  onRoomSelect,
  bookings,
  currentTime,
}: FloorPlanProps) {
  const [hoveredRoom, setHoveredRoom] = useState<FloorPlanRoom | null>(null)
  const [hoveredCommonZone, setHoveredCommonZone] = useState<{
    name: string
    subtitle: string
    description: string
    icon: string
    amenities: string[]
  } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Amenity filters state
  const [searchFilter, setSearchFilter] = useState("")
  const [filterBalcony, setFilterBalcony] = useState(false)
  const [filterScreen, setFilterScreen] = useState(false)
  const [filterAC, setFilterAC] = useState(false)
  const [filterLarge, setFilterLarge] = useState(false)

  // Use real-time room status updates
  const realtimeRooms = useRealtimeRoomStatus(rooms)

  const getRoomStatus = (room: FloorPlanRoom): FloorPlanRoom["status"] => {
    const now = currentTime
    const roomBookings = bookings.filter((b) => b.roomId === room.id)
    
    const activeBooking = roomBookings.find(
      (b) => new Date(b.startTime) <= now && new Date(b.endTime) > now
    )
    
    if (!activeBooking) return "available"
    if (activeBooking.status === "APPROVED") return "occupied"
    if (activeBooking.status === "PENDING") return "pending"
    return "maintenance"
  }

  // Next available slot aligned to 30-min intervals between 9 AM and 10 PM
  const getNextAvailable = (room: FloorPlanRoom): string | undefined => {
    const now = currentTime
    const roomBookings = bookings
      .filter((b) => b.roomId === room.id && b.status === "APPROVED")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    // Start from now, aligned to next 30-minute block
    const checkTime = new Date(now)
    const minutes = checkTime.getMinutes()
    if (minutes > 0 && minutes <= 30) {
      checkTime.setMinutes(30, 0, 0)
    } else if (minutes > 30) {
      checkTime.setHours(checkTime.getHours() + 1, 0, 0, 0)
    } else {
      checkTime.setSeconds(0, 0)
    }

    // Ensure within 9:00 AM to 10:00 PM
    if (checkTime.getHours() < 9) {
      checkTime.setHours(9, 0, 0, 0)
    }

    for (let i = 0; i < 26; i++) {
      const slotStart = new Date(checkTime.getTime() + i * 30 * 60 * 1000)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      if (slotStart.getHours() >= 22 || (slotStart.getHours() === 21 && slotStart.getMinutes() > 30)) {
        break
      }

      const isBooked = roomBookings.some(
        (b) => new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart
      )

      if (!isBooked) {
        return formatTime(slotStart)
      }
    }
    return undefined
  }

  const getCurrentBooking = (room: FloorPlanRoom) => {
    const now = currentTime
    const activeBooking = bookings.find(
      (b) =>
        b.roomId === room.id &&
        b.status === "APPROVED" &&
        new Date(b.startTime) <= now &&
        new Date(b.endTime) > now
    )
    
    if (!activeBooking) return null
    
    return {
      teamName: activeBooking.team.name,
      description: activeBooking.description || activeBooking.projectOrCommitteeName || "In Progress",
      endTime: formatTime(activeBooking.endTime),
    }
  }

  // Merge real-time status with computed status
  const roomsWithStatus = useMemo(() => {
    return rooms.map((room) => {
      const computedStatus = getRoomStatus(room)
      const realtimeRoom = realtimeRooms.find((r: FloorPlanRoom) => r.id === room.id)
      const realtimeStatus = realtimeRoom?.status
      
      return {
        ...room,
        status: realtimeStatus || computedStatus,
      }
    })
  }, [rooms, realtimeRooms, bookings, currentTime])

  // Filter matching logic
  const isRoomMatchingFilters = (room: FloorPlanRoom) => {
    if (searchFilter && !room.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false
    }
    if (filterBalcony && !room.hasBalcony) return false
    if (filterScreen && !room.hasScreen) return false
    if (filterAC && !room.hasAC) return false
    if (filterLarge && room.capacity < 25) return false
    return true
  }

  const hasActiveFilters = filterBalcony || filterScreen || filterAC || filterLarge || searchFilter.length > 0

  return (
    <div className="relative w-full h-full flex flex-col space-y-3" suppressHydrationWarning>
      {/* Search & Feature Filter Bar */}
      <div
        className="flex items-center justify-between gap-2 p-2 bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-xs overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap"
        suppressHydrationWarning
      >
        <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap flex-shrink-0" suppressHydrationWarning>
          <div className="relative w-36 sm:w-52 flex-shrink-0" suppressHydrationWarning>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search spaces..."
              value={searchFilter}
              autoComplete="off"
              data-form-type="other"
              suppressHydrationWarning
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 rounded-lg border-border/60"
            />
          </div>

          <Button
            size="sm"
            variant={filterAC ? "primary" : "outline"}
            onClick={() => setFilterAC(!filterAC)}
            className="h-8 text-xs gap-1.5 rounded-lg flex-shrink-0"
          >
            <Snowflake className="h-3.5 w-3.5" />
            <span>Air Conditioned</span>
            {filterAC && <Check className="h-3 w-3" />}
          </Button>

          <Button
            size="sm"
            variant={filterScreen ? "primary" : "outline"}
            onClick={() => setFilterScreen(!filterScreen)}
            className="h-8 text-xs gap-1.5 rounded-lg flex-shrink-0"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Screen/TV</span>
            {filterScreen && <Check className="h-3 w-3" />}
          </Button>

          <Button
            size="sm"
            variant={filterBalcony ? "primary" : "outline"}
            onClick={() => setFilterBalcony(!filterBalcony)}
            className="h-8 text-xs gap-1.5 rounded-lg flex-shrink-0"
          >
            <TreePine className="h-3.5 w-3.5" />
            <span>Balcony</span>
            {filterBalcony && <Check className="h-3 w-3" />}
          </Button>

          <Button
            size="sm"
            variant={filterLarge ? "primary" : "outline"}
            onClick={() => setFilterLarge(!filterLarge)}
            className="h-8 text-xs gap-1.5 rounded-lg flex-shrink-0"
          >
            <Users className="h-3.5 w-3.5" />
            <span>25+ Capacity</span>
            {filterLarge && <Check className="h-3 w-3" />}
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchFilter("")
              setFilterBalcony(false)
              setFilterScreen(false)
              setFilterAC(false)
              setFilterLarge(false)
            }}
            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg flex-shrink-0"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* SVG Canvas Area: Clean Architectural Blueprint */}
      <div className="relative w-full flex-1 flex items-center justify-center min-h-[360px] sm:min-h-[500px] overflow-hidden">
        <svg
          viewBox="0 0 960 520"
          className="w-full max-w-5xl h-auto max-h-[72vh] drop-shadow-md select-none rounded-2xl"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={(e) => {
            setTooltipPosition({ x: e.clientX, y: e.clientY })
          }}
        >
          <defs>
            {/* Ambient Blueprint Dot Grid */}
            <pattern id="arch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="#CBD5E1" />
            </pattern>

            {/* Subtle Gradients with Smooth Alpha */}
            <linearGradient id="grad-hall-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67C2B2" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#48A393" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="grad-hall-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B39BE8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#8F6FD6" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="grad-hall-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6BC4B4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#4E9E90" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="grad-shared-area" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1E4E38" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="grad-cafe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="grad-reception" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="grad-bathroom" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.98" />
            </linearGradient>

            {/* Glowing Drop Shadows */}
            <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#67C2B2" floodOpacity="0.85" />
            </filter>

            <filter id="subtle-lift" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background Dot Grid */}
          <rect width="100%" height="100%" fill="url(#arch-grid)" />

          {/* Master Architectural Blueprint Outer Shell (Smooth Rounded Frame) */}
          <rect
            x="45"
            y="30"
            width="875"
            height="460"
            rx="20"
            ry="20"
            fill="#F8FAFA"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* =========================================================================
              1. BALCONIES (Far Left: Rounded Balcony Decks)
              ========================================================================= */}
          {/* Room Balcony for Main Hall */}
          <g
            className="cursor-pointer"
            onMouseEnter={() =>
              setHoveredCommonZone({
                name: "Room Balcony",
                subtitle: "Balcony attached to Main Hall",
                description: "Direct balcony access connected to Main Hall with fresh air and plant terrace views.",
                icon: "🌿",
                amenities: ["Private to Main Hall", "Fresh Air", "Outdoor Seating"],
              })
            }
            onMouseLeave={() => setHoveredCommonZone(null)}
          >
            <rect
              x="55"
              y="45"
              width="50"
              height="175"
              rx="16"
              ry="16"
              fill="#2D6A4F"
              fillOpacity="0.08"
              stroke="#2D6A4F"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinejoin="round"
            />
            <text x="80" y="132" textAnchor="middle" transform="rotate(-90 80 132)" fontFamily="system-ui" fontSize="9" fontWeight="700" fill="#2D6A4F" letterSpacing="1.5">
              ROOM BALCONY
            </text>
          </g>

          {/* Shared Area Balcony */}
          <g
            className="cursor-pointer"
            onMouseEnter={() =>
              setHoveredCommonZone({
                name: "Balcony",
                subtitle: "Shared Area Outdoor Balcony",
                description: "Outdoor balcony terrace connected directly to the Shared Area.",
                icon: "🌿",
                amenities: ["Open Co-Working Access", "Fresh Air", "Outdoor Seating"],
              })
            }
            onMouseLeave={() => setHoveredCommonZone(null)}
          >
            <rect
              x="55"
              y="232"
              width="50"
              height="243"
              rx="16"
              ry="16"
              fill="#2D6A4F"
              fillOpacity="0.08"
              stroke="#2D6A4F"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinejoin="round"
            />
            <text x="80" y="353" textAnchor="middle" transform="rotate(-90 80 353)" fontFamily="system-ui" fontSize="10" fontWeight="700" fill="#2D6A4F" letterSpacing="2">
              BALCONY
            </text>
          </g>

          {/* =========================================================================
              2. KITCHEN (Top Right: x=726..905, width=179, y=45..220)
              Clear direct hallway doorway opening between x=726 and x=782 (56px wide)
              ========================================================================= */}
          <g
            className="cursor-pointer"
            onMouseEnter={() =>
              setHoveredCommonZone({
                name: "Kitchen",
                subtitle: "Coffee, Microwave & Refrigerator",
                description: "Pantry with espresso coffee machine, microwave, refrigerator, dining bar, ceiling fans, and power sockets.",
                icon: "☕",
                amenities: ["Espresso Machine", "Microwave", "Refrigerator", "Ceiling Fans 🌀", "Power Sockets ⚡"],
              })
            }
            onMouseLeave={() => setHoveredCommonZone(null)}
          >
            <rect
              x="726"
              y="45"
              width="179"
              height="175"
              rx="16"
              ry="16"
              fill="url(#grad-cafe)"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            
            {/* Center Pill Badge */}
            <g pointerEvents="none">
              <rect x="770" y="112" width="91" height="42" rx="12" ry="12" fill="#FFFFFF" fillOpacity="0.85" stroke="#FDE68A" strokeWidth="1" />
              <text x="815.5" y="130" textAnchor="middle" fontFamily="system-ui" fontSize="13" fontWeight="800" fill="#92400E">
                ☕ Kitchen
              </text>
              <text x="815.5" y="145" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#B45309">
                Coffee & Pantry
              </text>
            </g>
          </g>

          {/* =========================================================================
              3. UNIFIED RECEPTION & CIRCULATION ZONE
              ========================================================================= */}
          <g
            className="cursor-pointer"
            onMouseEnter={() =>
              setHoveredCommonZone({
                name: "Reception & Lounge",
                subtitle: "Front Desk, Lounge & Circulation",
                description: "Central front desk reception, visitor check-in, guest waiting area, and open circulation walkway.",
                icon: "🏢",
                amenities: ["Front Desk Concierge", "Guest Lounge", "Visitor Check-in", "Ceiling Fans 🌀", "Power Sockets ⚡"],
              })
            }
            onMouseLeave={() => setHoveredCommonZone(null)}
          >
            <path
              d="M 303 232 
                 L 754 232 
                 Q 770 232 770 248 
                 L 770 459 
                 Q 770 475 754 475 
                 L 708 475 
                 Q 692 475 692 459 
                 L 692 324 
                 Q 692 308 676 308 
                 L 551 308 
                 Q 535 308 535 324 
                 L 535 459 
                 Q 535 475 519 475 
                 L 303 475 
                 Q 287 475 287 459 
                 L 287 248 
                 Q 287 232 303 232 Z"
              fill="url(#grad-reception)"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Reception Center Pill Badge */}
            <g pointerEvents="none">
              <rect x="351" y="333" width="120" height="44" rx="12" ry="12" fill="#FFFFFF" fillOpacity="0.92" stroke="#E2E8F0" strokeWidth="1" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
              <text x="411" y="352" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="800" fill="#1A1A1A">
                Reception
              </text>
              <text x="411" y="367" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#64748B">
                Front Desk
              </text>
            </g>
          </g>

          {/* =========================================================================
              4. BATHROOM (Bottom Right: x=782..905, y=232..475)
              ========================================================================= */}
          <g
            className="cursor-pointer"
            onMouseEnter={() =>
              setHoveredCommonZone({
                name: "Bathroom",
                subtitle: "Private Stalls & Vanity",
                description: "Clean washrooms with private gender-neutral stalls, touchless vanity sinks, and mirrors.",
                icon: "🚻",
                amenities: ["Private Stalls", "Vanity Sinks", "Touchless Faucets"],
              })
            }
            onMouseLeave={() => setHoveredCommonZone(null)}
          >
            <rect
              x="782"
              y="232"
              width="123"
              height="243"
              rx="16"
              ry="16"
              fill="url(#grad-bathroom)"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Center Pill Badge */}
            <g pointerEvents="none">
              <rect x="798" y="333" width="90" height="42" rx="12" ry="12" fill="#FFFFFF" fillOpacity="0.85" stroke="#CBD5E1" strokeWidth="1" />
              <text x="843.5" y="351" textAnchor="middle" fontFamily="system-ui" fontSize="13" fontWeight="800" fill="#334155">
                🚻 Bathroom
              </text>
              <text x="843.5" y="366" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#64748B">
                Washroom
              </text>
            </g>
          </g>

          {/* =========================================================================
              5. BOOKABLE ROOMS (Main Hall: 30, Focus Room: 20, Meeting Room: 10, Shared Area: 50)
              ========================================================================= */}
          <g>
            {roomsWithStatus.map((room) => {
              const isMatch = isRoomMatchingFilters(room)
              const isDimmed = hasActiveFilters && !isMatch

              return (
                <RoomShape
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  isHovered={hoveredRoom?.id === room.id}
                  isDimmed={isDimmed}
                  onClick={() => {
                    setHoveredCommonZone(null)
                    onRoomSelect(room)
                  }}
                  onMouseEnter={() => {
                    setHoveredCommonZone(null)
                    setHoveredRoom(room)
                  }}
                  onMouseLeave={() => setHoveredRoom(null)}
                />
              )
            })}
          </g>

          {/* Dynamic Floating Glass Badge Pills */}
          <g fontFamily="system-ui" textAnchor="middle" pointerEvents="none">
            {roomsWithStatus.map((room) => {
              const isMatch = isRoomMatchingFilters(room)
              const isDimmed = hasActiveFilters && !isMatch
              const isDark = room.id === "shared-area"

              const bounds = ROOM_BOUNDS[room.id] || { x: 115, y: 45, width: 270, height: 175, rx: 16, badgeWidth: 130 }
              const centerX = bounds.x + bounds.width / 2
              const centerY = bounds.y + bounds.height / 2
              const badgeWidth = bounds.badgeWidth
              const badgeHeight = 44

              return (
                <g key={`badge-${room.id}`} opacity={isDimmed ? 0.3 : 1}>
                  {/* Frosted Glass Pill Backdrop */}
                  <rect
                    x={centerX - badgeWidth / 2}
                    y={centerY - badgeHeight / 2}
                    width={badgeWidth}
                    height={badgeHeight}
                    rx="14"
                    ry="14"
                    fill={isDark ? "rgba(15, 23, 42, 0.65)" : "rgba(255, 255, 255, 0.85)"}
                    stroke={isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.12)"}
                    strokeWidth="1"
                    strokeLinejoin="round"
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))"
                  />

                  {/* Room Name */}
                  <text
                    x={centerX}
                    y={centerY - 3}
                    fontFamily="system-ui"
                    fontSize="13"
                    fontWeight="800"
                    fill={isDark ? "#FFFFFF" : "#0F172A"}
                    letterSpacing="0.2"
                  >
                    {room.name}
                  </text>

                  {/* Capacity & Live Status Pill */}
                  <text
                    x={centerX}
                    y={centerY + 13}
                    fontFamily="system-ui"
                    fontSize="9.5"
                    fontWeight="700"
                    fill={isDark ? "#A7F3D0" : "#0D9488"}
                    letterSpacing="0.4"
                  >
                    {room.capacity} MAX • {room.status.toUpperCase()}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Floating Tooltips */}
        <AnimatePresence>
          {/* Bookable Room Tooltip */}
          {hoveredRoom && tooltipPosition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              className="fixed z-50 pointer-events-none"
              style={{
                left: tooltipPosition.x + 16,
                top: tooltipPosition.y - 16,
              }}
            >
              <RoomTooltip
                room={hoveredRoom}
                nextAvailableSlot={getNextAvailable(hoveredRoom)}
                currentBooking={getCurrentBooking(hoveredRoom)}
              />
            </motion.div>
          )}

          {/* Common Amenity Zone Tooltip (Reception, Kitchen, Bathroom, Balconies) */}
          {hoveredCommonZone && tooltipPosition && !hoveredRoom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              className="fixed z-50 pointer-events-none glass-strong rounded-2xl p-4 w-76 shadow-2xl border border-border/80 backdrop-blur-xl"
              style={{
                left: tooltipPosition.x + 16,
                top: tooltipPosition.y - 16,
              }}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xl">{hoveredCommonZone.icon}</span>
                <div>
                  <h4 className="font-extrabold text-foreground text-sm tracking-tight leading-tight">
                    {hoveredCommonZone.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{hoveredCommonZone.subtitle}</p>
                </div>
              </div>
              <Separator className="my-2 bg-border/60" />
              <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                {hoveredCommonZone.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {hoveredCommonZone.amenities.map((a, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] py-0 px-2 bg-card text-muted-foreground border-border/70 rounded-md">
                    {a}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Room Schedule Drawer */}
      <AnimatePresence mode="wait">
        {selectedRoom && (
          <>
            <div className="sidebar-overlay" onClick={() => onRoomSelect(null)} />
            <RoomSidebar
              room={selectedRoom}
              bookings={bookings}
              currentTime={currentTime}
              onClose={() => onRoomSelect(null)}
              onBook={() => {
                onRoomSelect(null)
                window.dispatchEvent(new CustomEvent("open-booking", { detail: selectedRoom }))
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Floating Status Legend */}
      <div className="fixed bottom-4 right-4 z-20 glass-strong rounded-2xl p-3 px-4 shadow-xl border border-border/80 backdrop-blur-md text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-foreground font-semibold">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
            <span className="text-foreground font-semibold">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className="text-foreground font-semibold">Pending</span>
          </div>
        </div>
      </div>
    </div>
  )
}