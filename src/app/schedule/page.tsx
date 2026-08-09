"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { BookingModal } from "@/components/booking/BookingModal"
import { cn, formatTime, formatDate, formatDuration, getConsolidatedDayTimeline } from "@/lib/utils"
import type { Room, BookingWithRelations, UserTeamRole, Team } from "@/types"

export default function SchedulePage() {
  const { data: session } = useSession()
  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all")
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [userRoles, setUserRoles] = useState<(UserTeamRole & { team: Team })[]>([])
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null)
  const [bookingInitialDate, setBookingInitialDate] = useState<Date>(new Date())
  const [unbookingId, setUnbookingId] = useState<string | null>(null)

  // Fetch rooms & bookings
  useEffect(() => {
    async function fetchData() {
      try {
        const dateStr = selectedDate.toISOString().split("T")[0]
        const [roomsRes, bookingsRes, teamsRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch(`/api/bookings?startDate=${dateStr}&endDate=${dateStr}`),
          fetch("/api/teams"),
        ])

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(roomsData)
        }
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json()
          setBookings(bookingsData)
        }
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          const roles: (UserTeamRole & { team: Team })[] = []
          teamsData.forEach((t: any) => {
            const teamObj = t.team || t
            roles.push({
              id: t.userTeamRoleId || `role-${t.id}`,
              userId: "user-1",
              user: {} as any,
              teamId: teamObj.id || t.id,
              customRoleTitle: t.customRoleTitle || t.userRole || "Member",
              committeeName: t.committeeName || null,
              createdAt: new Date(),
              team: teamObj,
            })
          })
          setUserRoles(roles)
        }
      } catch (err) {
        console.error("Error loading schedule data:", err)
      }
    }
    fetchData()
  }, [selectedDate])

  const filteredRooms = useMemo(() => {
    if (selectedRoomFilter === "all") return rooms
    return rooms.filter((r) => r.id === selectedRoomFilter)
  }, [rooms, selectedRoomFilter])

  const handleBookingSubmit = async (data: any) => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setBookingModalOpen(false)
      // Refresh bookings
      const dateStr = selectedDate.toISOString().split("T")[0]
      const refreshed = await fetch(`/api/bookings?startDate=${dateStr}&endDate=${dateStr}`)
      if (refreshed.ok) setBookings(await refreshed.json())
    } else {
      const err = await res.json()
      alert(err.error || "Failed to create booking.")
    }
  }

  const handleUnbook = async (bookingId: string) => {
    if (!confirm("Are you sure you want to unbook and release this reservation?")) return
    setUnbookingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        // Refresh bookings
        const dateStr = selectedDate.toISOString().split("T")[0]
        const refreshed = await fetch(`/api/bookings?startDate=${dateStr}&endDate=${dateStr}`)
        if (refreshed.ok) setBookings(await refreshed.json())
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
        // Refresh bookings
        const dateStr = selectedDate.toISOString().split("T")[0]
        const refreshed = await fetch(`/api/bookings?startDate=${dateStr}&endDate=${dateStr}`)
        if (refreshed.ok) setBookings(await refreshed.json())
      } else {
        alert("Failed to refuse pending request.")
      }
    } catch (err) {
      console.error("Error refusing:", err)
      alert("Error refusing pending request.")
    } finally {
      setUnbookingId(null)
    }
  }

  const isToday =
    selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0]

  const goToDay = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    setSelectedDate(next)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Universal Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Page Area */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-h-screen",
          sidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Daily Schedule</h1>
            </div>
            <Badge variant="outline" className="text-xs font-semibold py-0.5 border-primary/30 text-primary">
              9:00 AM – 10:00 PM
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                setBookingRoomId(rooms.length > 0 ? rooms[0].id : null)
                setBookingInitialDate(selectedDate)
                setBookingModalOpen(true)
              }}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Reservation
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                <Layers className="h-3.5 w-3.5" />
                Floor Plan
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Controls Bar: Date navigation & Room filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-xs">
            {/* Room Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={selectedRoomFilter === "all" ? "primary" : "outline"}
                onClick={() => setSelectedRoomFilter("all")}
                className="h-8 text-xs rounded-lg font-medium"
              >
                All Spaces ({rooms.length})
              </Button>
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  size="sm"
                  variant={selectedRoomFilter === room.id ? "primary" : "outline"}
                  onClick={() => setSelectedRoomFilter(room.id)}
                  className="h-8 text-xs rounded-lg font-medium"
                >
                  {room.name} ({room.capacity} Max)
                </Button>
              ))}
            </div>

            {/* Date Navigator Controls */}
            <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => goToDay(-1)}
                className="h-7 w-7 p-0 rounded-lg"
                title="Previous Day"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <div className="flex items-center gap-1.5 px-1">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <input
                  type="date"
                  value={selectedDate.toISOString().split("T")[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split("-").map(Number)
                      const nd = new Date(selectedDate)
                      nd.setFullYear(y, m - 1, d)
                      setSelectedDate(nd)
                    }
                  }}
                  className="bg-transparent border-none outline-none text-xs font-bold text-foreground cursor-pointer font-mono"
                />
              </div>

              {!isToday ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDate(new Date())}
                  className="h-6 text-[10px] px-2 rounded-md"
                >
                  Today
                </Button>
              ) : (
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                  Today
                </Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => goToDay(1)}
                className="h-7 w-7 p-0 rounded-lg"
                title="Next Day"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Timeline Grid (9 AM to 10 PM) */}
          <div className="space-y-6">
            {filteredRooms.map((room) => {
              const roomBookings = bookings.filter((b) => b.roomId === room.id)
              const approvedBookings = roomBookings.filter((b) => b.status === "APPROVED")
              const pendingBookings = roomBookings.filter((b) => b.status === "PENDING")

              // Role visibility: ONLY Managers, Admins, and Owners see Pending bookings
              const visibleRoomBookings = isManager
                ? roomBookings.filter((b) => b.status === "APPROVED" || b.status === "PENDING")
                : approvedBookings

              // Consolidated timeline: combined available times and combined bookings!
              const timelineBlocks = getConsolidatedDayTimeline(selectedDate, visibleRoomBookings, 9, 22)

              return (
                <Card key={room.id} className="border-border rounded-3xl overflow-hidden shadow-xs bg-card">
                  {/* Room Header */}
                  <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-foreground tracking-tight">
                          {room.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          Capacity: {room.capacity} Max • Working Hours: 9 AM – 10 PM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs py-0.5 px-2 bg-card">
                        {isManager
                          ? `${approvedBookings.length} Approved • ${pendingBookings.length} Pending`
                          : `${approvedBookings.length} Booked`}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBookingRoomId(room.id)
                          setBookingInitialDate(selectedDate)
                          setBookingModalOpen(true)
                        }}
                        className="h-8 text-xs gap-1 rounded-xl font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Book Space
                      </Button>
                    </div>
                  </div>

                  {/* Consolidated Schedule: Combined Available Spans & Bookings */}
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                                "p-4 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-3 shadow-xs",
                                isApproved
                                  ? isOwnBooking
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                                    : "bg-muted/40 border-border/70 text-foreground"
                                  : "bg-amber-500/10 border-amber-500/30 text-foreground"
                              )}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <div className="flex items-center gap-1.5 font-bold font-mono text-xs">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    <span>{block.timeLabel}</span>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[9px] py-0 px-1.5 font-mono",
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

                                <p className="font-extrabold text-foreground truncate text-sm mt-1">
                                  {booking.team.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {booking.description || booking.projectOrCommitteeName || "Reserved Session"}
                                </p>
                              </div>

                              {/* Manager / Admin / Owner Actions: Refuse for Pending, Unbook for Approved */}
                              {isManager && (
                                <div className="pt-2 border-t border-border/40 flex justify-end">
                                  {isPending ? (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={unbookingId === booking.id}
                                      onClick={() => handleRefuse(booking.id)}
                                      className="h-7 text-[10px] gap-1 px-2.5 rounded-lg font-bold shadow-xs bg-red-600 hover:bg-red-700 text-white"
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
                                      className="h-7 text-[10px] gap-1 px-2.5 rounded-lg font-bold shadow-xs"
                                      title="Unbook and release space"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>{unbookingId === booking.id ? "Unbooking..." : "Unbook Space"}</span>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        }

                        // Combined Available Block
                        return (
                          <div
                            key={block.start.toISOString()}
                            className="p-4 rounded-2xl border bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-xs transition-all flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="space-y-1 min-w-0">
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
                                setBookingRoomId(room.id)
                                setBookingInitialDate(block.start)
                                setBookingModalOpen(true)
                              }}
                              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-shrink-0 gap-1 px-3.5 shadow-xs"
                            >
                              + Book
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false)
          setBookingRoomId(null)
        }}
        onSubmit={handleBookingSubmit}
        userRoles={userRoles}
        rooms={rooms}
        initialRoomId={bookingRoomId || undefined}
        initialDate={bookingInitialDate}
      />
    </div>
  )
}
