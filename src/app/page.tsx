"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Users,
  LogOut,
  Menu,
  Bell,
  LayoutDashboard,
  Building2,
  ChevronDown,
  Sparkles,
  UserCheck,
  LogIn,
  Layers,
  Handshake,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { FloorPlan } from "@/components/floorplan/FloorPlan"
import { BookingModal } from "@/components/booking/BookingModal"
import { useRealtimeBookings } from "@/hooks/useSocket"
import { CreateUserModal } from "@/components/auth/CreateUserModal"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, getInitials } from "@/lib/utils"
import type { Room, BookingWithRelations, UserTeamRole, Team, FloorPlanRoom } from "@/types"
import { SiteNotificationModal, NotificationState } from "@/components/ui/SiteNotificationModal"

const DEFAULT_COORDINATES: Record<string, { path: string; centerX: number; centerY: number }> = {
  "hall-1": {
    path: "M115,45 L385,45 L385,220 L115,220 Z",
    centerX: 250,
    centerY: 132,
  },
  "hall-3": {
    path: "M397,45 L557,45 L557,220 L397,220 Z",
    centerX: 477,
    centerY: 132,
  },
  "hall-2": {
    path: "M569,45 L714,45 L714,220 L569,220 Z",
    centerX: 641.5,
    centerY: 132,
  },
  "shared-area": {
    path: "M115,232 L275,232 L275,475 L115,475 Z",
    centerX: 195,
    centerY: 353,
  },
}

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

export default function HomePage() {
  const { data: session, status } = useSession()
  const [selectedRoom, setSelectedRoom] = useState<FloorPlanRoom | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null)
  const [personaSwitcherOpen, setPersonaSwitcherOpen] = useState(false)
  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [partnersModalOpen, setPartnersModalOpen] = useState(false)
  const [notification, setNotification] = useState<NotificationState | null>(null)

  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const realtimeBookings = useRealtimeBookings(bookings)
  const [userRoles, setUserRoles] = useState<(UserTeamRole & { team: Team })[]>([])
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS)
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>
  >([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" || session?.user?.systemRole === "ADMIN"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch live bookings, rooms, user roles, and notifications
  useEffect(() => {
    async function fetchData() {
      try {
        const todayStr = new Date().toISOString().split("T")[0]
        const futureDateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]

        const isAuth = status === "authenticated"

        const [bookingsRes, roomsRes, rolesRes, notifRes] = await Promise.all([
          fetch(`/api/bookings?startDate=${todayStr}&endDate=${futureDateStr}`),
          fetch("/api/rooms"),
          isAuth ? fetch("/api/teams") : Promise.resolve(null),
          isAuth ? fetch("/api/notifications?limit=10") : Promise.resolve(null),
        ])

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json()
          setBookings(bookingsData)
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(roomsData)
        }

        if (rolesRes && rolesRes.ok) {
          const roles = await rolesRes.json()
          if (Array.isArray(roles)) {
            setUserRoles(
              roles.map((r: any) => {
                const teamObj: Team = r.team || {
                  id: r.id || r.teamId || "team-default",
                  name: r.name || "Default Team",
                  description: r.description || null,
                  createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                  updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
                }

                return {
                  id: r.userTeamRoleId || r.id || `utr-${Math.random()}`,
                  userId: session?.user?.id || "",
                  user: {
                    id: session?.user?.id || "",
                    name: session?.user?.name || null,
                    email: session?.user?.email || "",
                    image: session?.user?.image || null,
                    provider: "credentials",
                    systemRole: (session?.user?.systemRole as any) || "USER",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  teamId: teamObj.id,
                  team: teamObj,
                  committeeName: r.committeeName || null,
                  customRoleTitle: r.userRole || r.customRoleTitle || "Member",
                  createdAt: new Date(),
                }
              })
            )
          }
        }

        if (notifRes && notifRes.ok) {
          setNotifications(await notifRes.json())
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error)
      }
    }
    fetchData()
  }, [status, session])

  // Listen for booking modal trigger from floor plan drawer
  useEffect(() => {
    const handleOpenBooking = (e: CustomEvent) => {
      setBookingRoomId(e.detail.id)
      setBookingModalOpen(true)
    }
    window.addEventListener("open-booking", handleOpenBooking as EventListener)
    return () => window.removeEventListener("open-booking", handleOpenBooking as EventListener)
  }, [])

  const handleBookingSubmit = async (data: {
    roomId: string
    teamId: string
    userTeamRoleId: string
    projectOrCommitteeName: string
    startTime: Date
    endTime: Date
    description: string
  }) => {
    if (status !== "authenticated") {
      setPersonaSwitcherOpen(true)
      return
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create booking")
      }
      const newBooking = await res.json()
      setBookings((prev) => [...prev, newBooking])
      setBookingModalOpen(false)
      setBookingRoomId(null)
      setNotification({
        isOpen: true,
        title: "Booking Request Submitted",
        message: "🎉 Your reservation request has been submitted! Workspace managers will review it shortly.",
        type: "success",
      })
    } catch (error) {
      console.error("Booking failed:", error)
      setNotification({
        isOpen: true,
        title: "Booking Failed",
        message: error instanceof Error ? error.message : "Booking request could not be processed.",
        type: "error",
      })
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Dynamically map database rooms to FloorPlanRoom items with vector coordinates
  const floorPlanRooms: FloorPlanRoom[] = rooms.map((room) => {
    const defaultCoord = DEFAULT_COORDINATES[room.id] || {
      path: room.svgPolygonCoords || "M100,100 L300,100 L300,300 L100,300 Z",
      centerX: room.svgX || 200,
      centerY: room.svgY || 200,
    }

    return {
      id: room.id,
      name: room.name,
      path: room.svgPolygonCoords || defaultCoord.path,
      centerX: room.svgX > 0 ? room.svgX : defaultCoord.centerX,
      centerY: room.svgY > 0 ? room.svgY : defaultCoord.centerY,
      color: room.color || "#67C2B2",
      status: "available",
      capacity: room.capacity,
      hasScreen: room.hasScreen,
      hasBalcony: room.hasBalcony,
      hasAC: room.hasAC,
      hasWhiteboard: room.hasWhiteboard,
      hasPowerOutlets: room.hasPowerOutlets,
      description: room.description,
    }
  })

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Universal Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Floor Plan Area */}
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 pb-16 md:pb-0",
          sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        )}
      >
        {/* Top Navigation Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="md:hidden w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black text-sm shadow-xs flex-shrink-0">
              U
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight leading-tight">
                Floor Plan
              </h1>
              <p className="text-[10px] text-muted-foreground sm:hidden font-medium">Tap any room to book</p>
            </div>
            <Badge variant="available" className="hidden sm:inline-flex text-[11px] font-semibold py-0.5">
              Live Map
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active User Profile Pill / Auth CTA */}
            {status === "authenticated" ? (
              <div className="flex items-center gap-2.5 bg-muted/40 border border-border/80 px-3 py-1.5 rounded-2xl shadow-xs">
                <Avatar className="h-7 w-7 rounded-xl ring-1 ring-primary/30">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-tr from-primary to-emerald-600 text-white font-bold text-xs rounded-xl">
                    {session?.user?.name ? getInitials(session.user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-xs font-bold text-foreground truncate max-w-[130px]">
                    {session?.user?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[130px]">
                    {session?.user?.systemRole}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 gap-1.5 text-xs font-semibold rounded-xl"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="sm"
                    className="h-8 sm:h-9 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
                  >
                    <span>Create Account</span>
                  </Button>
                </Link>
              </div>
            )}

            {/* Notification Bell (for logged in accounts) */}
            {status === "authenticated" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 shadow-2xl">
                  <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Notifications</h4>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-primary hover:text-primary"
                        onClick={() => {
                          fetch("/api/notifications", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ markAllRead: true }),
                          })
                          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
                        }}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No notifications right now
                      </p>
                    ) : (
                      <div className="p-2 space-y-1.5">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "p-2.5 rounded-lg transition-colors text-xs border border-transparent",
                              !notif.isRead
                                ? "bg-primary/5 border-primary/20 font-medium"
                                : "hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <p className="font-semibold text-foreground">{notif.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Current Clock Time */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded-lg border border-border">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span suppressHydrationWarning>
                {mounted ? currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Floor Plan Canvas */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col">
          <FloorPlan
            rooms={floorPlanRooms}
            selectedRoom={selectedRoom}
            onRoomSelect={setSelectedRoom}
            bookings={realtimeBookings}
            currentTime={currentTime}
          />
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
        rooms={rooms.length > 0 ? rooms : (floorPlanRooms as any)}
        initialRoomId={bookingRoomId || undefined}
        initialDate={new Date()}
      />

      <SiteNotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  )
}
