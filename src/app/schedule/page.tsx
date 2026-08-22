"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Check,
  X,
  Building2,
  ShieldCheck,
  Eye,
  Filter,
  CreditCard,
  Tag,
  Info,
  Tv,
  Wind,
  Zap,
  FileText,
  AlertCircle,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { BookingModal } from "@/components/booking/BookingModal"
import { useRealtimeBookings } from "@/hooks/useSocket"
import { SiteNotificationModal, NotificationState } from "@/components/ui/SiteNotificationModal"
import {
  cn,
  formatTime,
  formatDate,
  formatDuration,
  getConsolidatedDayTimeline,
  getInitials,
} from "@/lib/utils"
import type { Room, BookingWithRelations, UserTeamRole, Team } from "@/types"

const DEFAULT_ROOMS: Room[] = [
  {
    id: "hall-1",
    name: "Main Hall",
    capacity: 30,
    hasScreen: true,
    hasBalcony: true,
    hasAC: true,
    hasWhiteboard: true,
    hasPowerOutlets: true,
    description:
      "Large conference hall with air conditioning, presentation screen/TV, magnetic whiteboard, ceiling fans, power sockets, and private room balcony access.",
    svgPolygonCoords: "M115,45 L385,45 L385,220 L115,220 Z",
    svgX: 250,
    svgY: 132,
    color: "#67C2B2",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "hall-3",
    name: "Focus Room",
    capacity: 20,
    hasScreen: true,
    hasBalcony: false,
    hasAC: true,
    hasWhiteboard: true,
    hasPowerOutlets: true,
    description:
      "Collaboration and focus room with air conditioning, presentation screen/TV, whiteboard, ceiling fans, and power sockets.",
    svgPolygonCoords: "M397,45 L557,45 L557,220 L397,220 Z",
    svgX: 477,
    svgY: 132,
    color: "#5AB0A0",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "hall-2",
    name: "Meeting Room",
    capacity: 10,
    hasScreen: false,
    hasBalcony: false,
    hasAC: false,
    hasWhiteboard: false,
    hasPowerOutlets: true,
    description: "Compact meeting room with ceiling fans and power sockets.",
    svgPolygonCoords: "M569,45 L714,45 L714,220 L569,220 Z",
    svgX: 641.5,
    svgY: 132,
    color: "#A286DB",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "shared-area",
    name: "Shared Area",
    capacity: 50,
    hasScreen: false,
    hasBalcony: true,
    hasAC: false,
    hasWhiteboard: false,
    hasPowerOutlets: true,
    description:
      "Open co-working area for up to 50 people with natural airflow, double balcony access, ceiling fans, and power sockets throughout.",
    svgPolygonCoords: "M115,232 L275,232 L275,475 L115,475 Z",
    svgX: 195,
    svgY: 353,
    color: "#52D1A3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export default function SchedulePage() {
  const { data: session } = useSession()
  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"upcoming" | "timeline" | "pending">("upcoming")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS)
  const [rawBookings, setRawBookings] = useState<BookingWithRelations[]>([])
  const bookings = useRealtimeBookings(rawBookings)

  const [userRoles, setUserRoles] = useState<(UserTeamRole & { team: Team })[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null)
  const [bookingInitialDate, setBookingInitialDate] = useState<Date>(new Date())
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Fetch rooms, upcoming bookings (next 30 days), and user team roles
  useEffect(() => {
    async function fetchData() {
      try {
        const todayStr = new Date().toISOString().split("T")[0]
        const futureDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]

        const [roomsRes, bookingsRes, teamsRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch(`/api/bookings?startDate=${todayStr}&endDate=${futureDateStr}`),
          fetch("/api/teams"),
        ])

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(roomsData)
        }
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json()
          setRawBookings(bookingsData)
        }
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          const roles: (UserTeamRole & { team: Team })[] = []
          teamsData.forEach((t: any) => {
            const teamObj = t.team || t
            roles.push({
              id: t.userTeamRoleId || `role-${t.id}`,
              userId: session?.user?.id || "user-1",
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
  }, [session])

  // Refresh bookings helper
  const refreshBookings = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const futureDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
      const res = await fetch(`/api/bookings?startDate=${todayStr}&endDate=${futureDateStr}`)
      if (res.ok) {
        const data = await res.json()
        setRawBookings(data)
        // If drawer is open, sync it with updated object
        if (selectedBooking) {
          const updated = data.find((b: BookingWithRelations) => b.id === selectedBooking.id)
          setSelectedBooking(updated || null)
        }
      }
    } catch (e) {
      console.error("Failed to refresh bookings:", e)
    }
  }

  const [notification, setNotification] = useState<NotificationState | null>(null)

  // Handle Approve (Managers only)
  const handleApprove = async (bookingId: string) => {
    setActionLoadingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      })
      if (res.ok) {
        await refreshBookings()
      } else {
        const err = await res.json()
        setNotification({ isOpen: true, title: "Approval Failed", message: err.error || "Failed to approve booking.", type: "error" })
      }
    } catch (err) {
      console.error("Error approving booking:", err)
      setNotification({ isOpen: true, title: "Error", message: "Error approving booking.", type: "error" })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Refuse (Managers only)
  const handleRefuse = async (bookingId: string) => {
    if (!confirm("Are you sure you want to refuse and reject this pending booking request?")) return
    setActionLoadingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: "Refused by workspace manager",
        }),
      })
      if (res.ok) {
        await refreshBookings()
      } else {
        const err = await res.json()
        setNotification({ isOpen: true, title: "Decline Failed", message: err.error || "Failed to refuse request.", type: "error" })
      }
    } catch (err) {
      console.error("Error refusing booking:", err)
      setNotification({ isOpen: true, title: "Error", message: "Error refusing request.", type: "error" })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Unbook / Delete (Managers only)
  const handleUnbook = async (bookingId: string) => {
    if (!confirm("Are you sure you want to unbook and release this reservation?")) return
    setActionLoadingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await refreshBookings()
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking(null)
        }
      } else {
        setNotification({ isOpen: true, title: "Unbook Failed", message: "Failed to unbook reservation.", type: "error" })
      }
    } catch (err) {
      console.error("Error unbooking:", err)
      setNotification({ isOpen: true, title: "Error", message: "Error unbooking reservation.", type: "error" })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleBookingSubmit = async (data: any) => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setBookingModalOpen(false)
      await refreshBookings()
      setNotification({ isOpen: true, title: "Booking Request Submitted", message: "🎉 Your reservation request has been submitted! Workspace managers will review it shortly.", type: "success" })
    } else {
      const err = await res.json()
      setNotification({ isOpen: true, title: "Booking Failed", message: err.error || "Failed to create booking.", type: "error" })
    }
  }

  // Pending bookings (STRICT PRIVACY: ONLY Visible to Manager / Admin / Owner)
  const pendingBookings = useMemo(() => {
    if (!isManager) return []
    return bookings.filter((b) => b.status === "PENDING")
  }, [bookings, isManager])

  // Filtered Upcoming Approved Bookings
  const upcomingApprovedBookings = useMemo(() => {
    const now = new Date()
    return bookings
      .filter((b) => b.status === "APPROVED" && new Date(b.endTime) >= now)
      .filter((b) => {
        if (selectedRoomFilter !== "all" && b.roomId !== selectedRoomFilter) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchesTeam = b.team?.name?.toLowerCase().includes(q)
          const matchesRoom = b.room?.name?.toLowerCase().includes(q)
          const matchesProject = (b.description || b.projectOrCommitteeName || "").toLowerCase().includes(q)
          const matchesBooker = (b.user?.name || "").toLowerCase().includes(q)
          return matchesTeam || matchesRoom || matchesProject || matchesBooker
        }
        return true
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [bookings, selectedRoomFilter, searchQuery])

  // Group upcoming bookings by formatted date
  const groupedUpcomingBookings = useMemo(() => {
    const groups: Record<string, BookingWithRelations[]> = {}
    upcomingApprovedBookings.forEach((b) => {
      const dateKey = new Date(b.startTime).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(b)
    })
    return groups
  }, [upcomingApprovedBookings])

  const filteredRooms = useMemo(() => {
    if (selectedRoomFilter === "all") return rooms
    return rooms.filter((r) => r.id === selectedRoomFilter)
  }, [rooms, selectedRoomFilter])

  // Date navigation for Daily Timeline
  const goToDay = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    setSelectedDate(next)
  }

  const isToday =
    selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Universal Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Page Area */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-h-screen pb-20 md:pb-0 relative",
          sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        )}
      >
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                Schedule & Bookings
              </h1>
              <p className="text-[10px] text-muted-foreground sm:hidden font-medium">All room reservations</p>
            </div>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-xs font-semibold py-0.5 border-primary/30 text-primary"
            >
              {upcomingApprovedBookings.length} Upcoming Reservations
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {session?.user && (
              <div className="hidden sm:flex items-center gap-2 bg-muted/40 border border-border/80 px-2.5 py-1 rounded-xl shadow-xs">
                <Avatar className="h-6 w-6 rounded-lg ring-1 ring-primary/30">
                  <AvatarImage src={session.user.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-tr from-primary to-emerald-600 text-white font-bold text-[10px] rounded-lg">
                    {session.user.name ? getInitials(session.user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-foreground truncate max-w-[110px]">
                    {session.user.name}
                  </p>
                </div>
              </div>
            )}

            <Button
              size="sm"
              onClick={() => {
                setBookingRoomId(rooms.length > 0 ? rooms[0].id : null)
                setBookingInitialDate(new Date())
                setBookingModalOpen(true)
              }}
              className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Book Space</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Tabs & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-xs">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/80">
              <Button
                size="sm"
                variant={activeTab === "upcoming" ? "primary" : "ghost"}
                onClick={() => setActiveTab("upcoming")}
                className="h-8 text-xs font-bold rounded-lg gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Upcoming Bookings ({upcomingApprovedBookings.length})</span>
              </Button>

              <Button
                size="sm"
                variant={activeTab === "timeline" ? "primary" : "ghost"}
                onClick={() => setActiveTab("timeline")}
                className="h-8 text-xs font-bold rounded-lg gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Daily Timeline</span>
              </Button>

              {/* Managers / Admins / Owners ONLY: Pending Requests Tab */}
              {isManager && (
                <Button
                  size="sm"
                  variant={activeTab === "pending" ? "destructive" : "ghost"}
                  onClick={() => setActiveTab("pending")}
                  className={cn(
                    "h-8 text-xs font-bold rounded-lg gap-1.5",
                    activeTab !== "pending" && pendingBookings.length > 0 && "text-amber-600 dark:text-amber-400 font-extrabold"
                  )}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Pending Requests</span>
                  {pendingBookings.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded-full text-[10px] font-black">
                      {pendingBookings.length}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Room Filter Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={selectedRoomFilter === "all" ? "outline" : "ghost"}
                onClick={() => setSelectedRoomFilter("all")}
                className={cn(
                  "h-7 text-xs rounded-lg font-medium",
                  selectedRoomFilter === "all" && "border-primary text-primary bg-primary/5"
                )}
              >
                All Rooms
              </Button>
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  size="sm"
                  variant={selectedRoomFilter === room.id ? "outline" : "ghost"}
                  onClick={() => setSelectedRoomFilter(room.id)}
                  className={cn(
                    "h-7 text-xs rounded-lg font-medium",
                    selectedRoomFilter === room.id && "border-primary text-primary bg-primary/5"
                  )}
                >
                  {room.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Bar for Upcoming View */}
          {activeTab === "upcoming" && (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by team, project, booker, or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* =========================================================================
              TAB 1: UPCOMING APPROVED BOOKINGS (Cards View with Interactive Drawer)
              ========================================================================= */}
          {activeTab === "upcoming" && (
            <div className="space-y-6">
              {Object.keys(groupedUpcomingBookings).length === 0 ? (
                <div className="text-center py-16 px-4 bg-card rounded-3xl border border-border space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">No Upcoming Approved Bookings</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    There are no scheduled reservations matching your current filters. Click below to book a room.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setBookingRoomId(rooms[0]?.id || null)
                      setBookingModalOpen(true)
                    }}
                    className="mt-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground"
                  >
                    + Book a Space Now
                  </Button>
                </div>
              ) : (
                Object.entries(groupedUpcomingBookings).map(([dateLabel, dayBookings]) => (
                  <div key={dateLabel} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <h3 className="font-bold text-sm text-foreground tracking-tight">{dateLabel}</h3>
                      <Badge variant="outline" className="text-[10px] py-0 px-2 bg-muted/30">
                        {dayBookings.length} {dayBookings.length === 1 ? "Booking" : "Bookings"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {dayBookings.map((b) => {
                        const start = new Date(b.startTime)
                        const end = new Date(b.endTime)
                        const isOwnBooking =
                          isManager ||
                          (session?.user?.email &&
                            ((session?.user?.email.includes("hawkinsight") &&
                              (b.team?.name?.includes("Hawk") || b.teamId === "hawk-insight")) ||
                              (session?.user?.email.includes("nexuslabs") &&
                                (b.team?.name?.includes("Nexus") || b.teamId === "nexus-labs")) ||
                              (session?.user?.email.includes("freelancer") &&
                                (b.team?.name?.includes("Nexus") || b.teamId === "nexus-labs")) ||
                              b.user?.email === session?.user?.email ||
                              b.userId === session?.user?.id))

                        return (
                          <motion.div
                            key={b.id}
                            whileHover={{ y: -2 }}
                            onClick={() => setSelectedBooking(b)}
                            className={cn(
                              "p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-3 group relative overflow-hidden",
                              selectedBooking?.id === b.id && "ring-2 ring-primary border-primary"
                            )}
                          >
                            <div className="space-y-2.5">
                              {/* Top Row: Room Pill & Status Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: b.room?.color || "#67C2B2" }}
                                  />
                                  <span className="font-bold text-xs text-foreground tracking-tight">
                                    {b.room?.name}
                                  </span>
                                </div>

                                {isOwnBooking ? (
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
                                )}
                              </div>

                              {/* Time & Duration */}
                              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>
                                  {formatTime(start)} – {formatTime(end)}
                                </span>
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono bg-muted/40">
                                  {formatDuration(start, end)}
                                </Badge>
                              </div>

                              {/* Team Name & Project */}
                              <div>
                                <div className="flex items-center gap-1.5 justify-between">
                                  <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                    {b.team?.name || "Reserved"}
                                  </h4>
                                  {b.isIncognito && (
                                    <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-400 font-bold flex-shrink-0">
                                      Private Session
                                    </Badge>
                                  )}
                                </div>
                                {(b.description?.trim() || b.projectOrCommitteeName?.trim()) && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {b.description?.trim() || b.projectOrCommitteeName?.trim()}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Footer: Booker info & quick 'View Details' CTA */}
                            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-muted-foreground text-[11px]">
                              <div className="flex items-center gap-1.5 truncate">
                                <Avatar className="h-5 w-5 rounded-md">
                                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                    {b.user?.name ? getInitials(b.user.name) : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[120px] font-medium">{b.user?.name || "Member"}</span>
                              </div>

                              <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 group-hover:underline">
                                View Info →
                              </span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: DAILY TIMELINE (Hourly Grid View with Booking Blocks)
              ========================================================================= */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {/* Date Navigator */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToDay(-1)}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="h-4 w-4 text-primary" />
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
                      className="h-7 text-xs px-2.5 rounded-lg"
                    >
                      Today
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
                      Today
                    </Badge>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToDay(1)}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground hidden sm:block">
                  Click any booking card to open details sidebar
                </p>
              </div>

              {/* Room Timeline Cards */}
              <div className="space-y-6">
                {filteredRooms.map((room) => {
                  const roomBookings = bookings.filter(
                    (b) =>
                      b.roomId === room.id &&
                      new Date(b.startTime).toDateString() === selectedDate.toDateString()
                  )
                  const approvedBookings = roomBookings.filter((b) => b.status === "APPROVED")
                  const pendingBookings = roomBookings.filter((b) => b.status === "PENDING")

                  // Role visibility: ONLY Managers, Admins, and Owners see Pending bookings
                  const visibleRoomBookings = isManager
                    ? roomBookings.filter((b) => b.status === "APPROVED" || b.status === "PENDING")
                    : approvedBookings

                  const timelineBlocks = getConsolidatedDayTimeline(
                    selectedDate,
                    visibleRoomBookings,
                    9,
                    22
                  )

                  return (
                    <Card key={room.id} className="border-border rounded-3xl overflow-hidden shadow-xs bg-card">
                      <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs"
                            style={{ backgroundColor: room.color || "#67C2B2" }}
                          >
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-foreground tracking-tight">
                              {room.name}
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium">
                              Capacity: {room.capacity} Max • 9 AM – 10 PM
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
                                  ((session?.user?.email.includes("hawkinsight") &&
                                    (booking.team?.name?.includes("Hawk") ||
                                      booking.teamId === "hawk-insight")) ||
                                    (session?.user?.email.includes("nexuslabs") &&
                                      (booking.team?.name?.includes("Nexus") ||
                                        booking.teamId === "nexus-labs")) ||
                                    (session?.user?.email.includes("freelancer") &&
                                      (booking.team?.name?.includes("Nexus") ||
                                        booking.teamId === "nexus-labs")) ||
                                    booking.user?.email === session?.user?.email ||
                                    booking.userId === session?.user?.id))

                              return (
                                <div
                                  key={booking.id || index}
                                  onClick={() => setSelectedBooking(booking)}
                                  className={cn(
                                    "p-4 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-3 shadow-xs cursor-pointer hover:border-primary/60",
                                    isApproved
                                      ? isOwnBooking
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                                        : "bg-muted/40 border-border/70 text-foreground"
                                      : "bg-amber-500/10 border-amber-500/30 text-foreground",
                                    selectedBooking?.id === booking.id && "ring-2 ring-primary"
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
                                            isApproved &&
                                              isOwnBooking &&
                                              "bg-card text-emerald-700 border-emerald-300"
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

                                    <div className="flex items-center gap-1.5 justify-between mt-1">
                                      <p className="font-extrabold text-foreground truncate text-sm">
                                        {booking.team?.name || "Reserved"}
                                      </p>
                                      {booking.isIncognito && (
                                        <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-400 font-bold flex-shrink-0">
                                          Private Session
                                        </Badge>
                                      )}
                                    </div>
                                    {(booking.description?.trim() || booking.projectOrCommitteeName?.trim()) && (
                                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                        {booking.description?.trim() || booking.projectOrCommitteeName?.trim()}
                                      </p>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{booking.user?.name || "Member"}</span>
                                    <span className="text-[10px] font-bold text-primary hover:underline">
                                      Details →
                                    </span>
                                  </div>
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
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1.5 font-mono bg-card text-emerald-700 border-emerald-300"
                                    >
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
          )}

          {/* =========================================================================
              TAB 3: PENDING APPROVAL QUEUE (Admin / Owner / Manager EXCLUSIVE)
              ========================================================================= */}
          {activeTab === "pending" && isManager && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold flex-shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">Manager Approval Queue</h3>
                    <p className="text-xs text-muted-foreground">
                      Only Workspace Managers, Owners, and Admins can review and approve pending room requests.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="font-bold text-xs bg-card text-amber-600 border-amber-400">
                  {pendingBookings.length} Requests Pending
                </Badge>
              </div>

              {pendingBookings.length === 0 ? (
                <div className="text-center py-16 px-4 bg-card rounded-3xl border border-border space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-base text-foreground">All Clear!</h3>
                  <p className="text-xs text-muted-foreground">
                    There are no pending booking requests waiting for manager approval.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingBookings.map((b) => {
                    const start = new Date(b.startTime)
                    const end = new Date(b.endTime)
                    const isLoading = actionLoadingId === b.id

                    return (
                      <Card
                        key={b.id}
                        className="border-border rounded-2xl overflow-hidden shadow-xs hover:border-primary/50 transition-all bg-card"
                      >
                        <CardContent className="p-4 sm:p-5 space-y-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: b.room?.color || "#67C2B2" }}
                              />
                              <h4 className="font-bold text-sm text-foreground">{b.room?.name}</h4>
                            </div>
                            <Badge variant="pending" className="text-[10px] font-bold">
                              Pending Approval
                            </Badge>
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium">Requested By:</span>
                              <span className="font-bold text-foreground">{b.user?.name || "Tenant"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium">Organization:</span>
                              <span className="font-bold text-foreground">{b.team?.name || "Independent"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium">Role:</span>
                              <span className="font-semibold text-primary">{b.roleTitleUsed || "Member"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium">Schedule:</span>
                              <span className="font-mono font-bold text-foreground">
                                {start.toLocaleDateString([], { month: "short", day: "numeric" })} • {formatTime(start)} – {formatTime(end)}
                              </span>
                            </div>
                            {b.description && (
                              <div className="pt-1.5 border-t border-border/40">
                                <span className="text-muted-foreground text-[11px] block">Project / Purpose:</span>
                                <p className="text-foreground text-[11px] italic mt-0.5">"{b.description}"</p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Approve / Refuse */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedBooking(b)}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Sidebar
                            </Button>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isLoading}
                                onClick={() => handleRefuse(b.id)}
                                className="h-8 text-xs px-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white gap-1 shadow-xs"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>{isLoading ? "Processing..." : "Refuse"}</span>
                              </Button>

                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleApprove(b.id)}
                                className="h-8 text-xs px-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>{isLoading ? "Processing..." : "Approve"}</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          BOOKING INFO SIDEBAR DRAWER (Sliding view matching Floor Plan style)
          ========================================================================= */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
            />

            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0"
                    style={{ backgroundColor: selectedBooking.room?.color || "#67C2B2" }}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-foreground tracking-tight">
                      {selectedBooking.room?.name || "Room"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Capacity: {selectedBooking.room?.capacity} People Max
                    </p>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedBooking(null)}
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Content */}
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-5">
                  {/* Status Banner */}
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs",
                      selectedBooking.status === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : selectedBooking.status === "PENDING"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                        : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedBooking.status === "APPROVED" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          {selectedBooking.status === "APPROVED"
                            ? "Reservation Confirmed"
                            : selectedBooking.status === "PENDING"
                            ? "Pending Manager Review"
                            : "Reservation Cancelled"}
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          {selectedBooking.status === "APPROVED"
                            ? "Room reserved and ready for check-in."
                            : "Awaiting approval from workspace management."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Details Card */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Date & Time</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-bold text-foreground">
                          {new Date(selectedBooking.startTime).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Time Window:</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatTime(new Date(selectedBooking.startTime))} –{" "}
                          {formatTime(new Date(selectedBooking.endTime))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {formatDuration(
                            new Date(selectedBooking.startTime),
                            new Date(selectedBooking.endTime)
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Tenant & Booker Information Card */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>Tenant & Booker</span>
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Organization:</span>
                        <span className="font-extrabold text-foreground">
                          {selectedBooking.team?.name || "Independent"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Booked By:</span>
                        <span className="font-bold text-foreground">
                          {selectedBooking.user?.name || "Workspace Member"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Role Title:</span>
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                          {selectedBooking.roleTitleUsed || "Member"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {selectedBooking.user?.email || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Project / Purpose */}
                  {(selectedBooking.description?.trim() || selectedBooking.projectOrCommitteeName?.trim()) && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>Project / Committee Purpose</span>
                      </h4>
                      <p className="text-xs text-foreground font-medium">
                        {selectedBooking.description?.trim() || selectedBooking.projectOrCommitteeName?.trim()}
                      </p>
                    </div>
                  )}

                  {/* Payment & Reference Code */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        Payment Type:
                      </span>
                      <span className="font-bold text-foreground">💵 Cash on Arrival</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Reference ID:
                      </span>
                      <span className="font-mono font-bold text-primary text-[11px]">
                        UTP-{selectedBooking.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Room Amenities */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Space Amenities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBooking.room?.hasAC && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                          <Wind className="h-3 w-3 text-cyan-500" /> Air Conditioning
                        </Badge>
                      )}
                      {selectedBooking.room?.hasScreen && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                          <Tv className="h-3 w-3 text-blue-500" /> Screen / TV
                        </Badge>
                      )}
                      {selectedBooking.room?.hasWhiteboard && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                          Whiteboard
                        </Badge>
                      )}
                      {selectedBooking.room?.hasBalcony && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                          Balcony Terrace
                        </Badge>
                      )}
                      {selectedBooking.room?.hasPowerOutlets && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                          <Zap className="h-3 w-3 text-amber-500" /> Power Sockets
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Drawer Footer Actions */}
              {(() => {
                const isPast = new Date(selectedBooking.endTime) <= new Date()
                const isRequester = session?.user?.id === selectedBooking.userId || session?.user?.email === selectedBooking.user?.email

                if (isPast) {
                  return (
                    <div className="p-4 border-t border-border bg-card flex items-center justify-center">
                      <Badge variant="outline" className="text-xs py-1 px-3 bg-muted text-muted-foreground border-border font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Session Completed (Locked)</span>
                      </Badge>
                    </div>
                  )
                }

                if (isManager) {
                  return (
                    <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
                      {selectedBooking.status === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoadingId === selectedBooking.id}
                            onClick={() => handleRefuse(selectedBooking.id)}
                            className="h-9 text-xs px-4 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-xs"
                          >
                            <X className="h-4 w-4" />
                            <span>{actionLoadingId === selectedBooking.id ? "Refusing..." : "Refuse Request"}</span>
                          </Button>

                          <Button
                            size="sm"
                            disabled={actionLoadingId === selectedBooking.id}
                            onClick={() => handleApprove(selectedBooking.id)}
                            className="h-9 text-xs px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                          >
                            <Check className="h-4 w-4" />
                            <span>{actionLoadingId === selectedBooking.id ? "Approving..." : "Approve Request"}</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoadingId === selectedBooking.id}
                          onClick={() => handleUnbook(selectedBooking.id)}
                          className="h-9 text-xs px-4 rounded-xl font-bold gap-1.5 shadow-xs w-full justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{actionLoadingId === selectedBooking.id ? "Unbooking..." : "Unbook & Release Space"}</span>
                        </Button>
                      )}
                    </div>
                  )
                }

                if (isRequester && selectedBooking.status === "PENDING") {
                  return (
                    <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoadingId === selectedBooking.id}
                        onClick={() => handleUnbook(selectedBooking.id)}
                        className="h-9 text-xs px-4 rounded-xl font-bold border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Withdraw Unrequest</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setBookingRoomId(selectedBooking.roomId)
                          setBookingInitialDate(new Date(selectedBooking.startTime))
                          setBookingModalOpen(true)
                        }}
                        className="h-9 text-xs px-4 rounded-xl font-bold bg-primary text-primary-foreground gap-1.5"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Reschedule Request</span>
                      </Button>
                    </div>
                  )
                }

                return null
              })()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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

      <SiteNotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  )
}
