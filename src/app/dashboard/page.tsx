"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  ChevronDown,
  Building2,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Layers,
  UserCheck,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { TeamsModal } from "@/components/teams/TeamsModal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteNotificationModal, type NotificationState } from "@/components/ui/SiteNotificationModal"
import { cn, formatTime, formatDate } from "@/lib/utils"
import type { BookingWithRelations } from "@/types"

interface ApprovalQueueItem extends BookingWithRelations {
  conflictingApproved?: BookingWithRelations[]
  conflictingPending?: BookingWithRelations[]
  hasConflict: boolean
}

export default function ApprovalDashboard() {
  const { data: session, status: authStatus } = useSession()
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([])
  const [pendingTeams, setPendingTeams] = useState<any[]>([])
  const [pendingCustomRoles, setPendingCustomRoles] = useState<any[]>([])
  const [teamActionLoading, setTeamActionLoading] = useState<string | null>(null)
  const [rejectingTeam, setRejectingTeam] = useState<any | null>(null)
  const [teamRejectionReason, setTeamRejectionReason] = useState("")

  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBookingsToday: 0,
    pendingApprovals: 0,
    pendingTeamsCount: 0,
    pendingCustomRolesCount: 0,
    occupiedRooms: 0,
    revenueToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"bookings" | "teams" | "roles">("bookings")
  const [filter, setFilter] = useState<"all" | "conflicts">("all")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Modals
  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [rejectingBooking, setRejectingBooking] = useState<ApprovalQueueItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [reschedulingBooking, setReschedulingBooking] = useState<ApprovalQueueItem | null>(null)
  const [rescheduleStart, setRescheduleStart] = useState("")
  const [rescheduleEnd, setRescheduleEnd] = useState("")
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const fetchDashboardData = async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setQueue(data.approvalQueue || [])
        setPendingTeams(data.pendingTeams || [])
        setPendingCustomRoles(data.pendingCustomRoles || [])
        setStats(data.stats || { totalRooms: 0, totalBookingsToday: 0, pendingApprovals: 0, pendingTeamsCount: 0, pendingCustomRolesCount: 0, occupiedRooms: 0, revenueToday: 0 })
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus !== "unauthenticated") {
      fetchDashboardData(queue.length === 0)
    } else {
      setLoading(false)
    }
  }, [selectedDate, authStatus])

  const [notification, setNotification] = useState<NotificationState | null>(null)

  const handleUpdateRoleStatus = async (roleId: string, status: "APPROVED" | "REJECTED") => {
    setTeamActionLoading(roleId)
    try {
      const res = await fetch(`/api/profile/roles/${roleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchDashboardData(false)
      } else {
        setNotification({ isOpen: true, title: "Action Failed", message: `Failed to ${status.toLowerCase()} custom role.`, type: "error" })
      }
    } catch (err) {
      console.error("Error updating custom role:", err)
      setNotification({ isOpen: true, title: "Error", message: "Error updating custom role.", type: "error" })
    } finally {
      setTeamActionLoading(null)
    }
  }

  const handleApproveTeam = async (teamId: string) => {
    setTeamActionLoading(teamId)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      })
      if (res.ok) {
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Approval Failed", message: "Failed to approve team request.", type: "error" })
      }
    } catch (error) {
      console.error("Error approving team:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error approving team request.", type: "error" })
    } finally {
      setTeamActionLoading(null)
    }
  }

  const confirmRejectTeam = async () => {
    if (!rejectingTeam) return
    setTeamActionLoading(rejectingTeam.id)
    try {
      const res = await fetch(`/api/teams/${rejectingTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason: teamRejectionReason }),
      })
      if (res.ok) {
        setRejectingTeam(null)
        setTeamRejectionReason("")
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Decline Failed", message: "Failed to decline team request.", type: "error" })
      }
    } catch (error) {
      console.error("Error declining team:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error declining team request.", type: "error" })
    } finally {
      setTeamActionLoading(null)
    }
  }

  const handleApprove = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      })
      if (res.ok) {
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Approval Failed", message: "Failed to approve booking.", type: "error" })
      }
    } catch (error) {
      console.error("Error approving:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error approving booking.", type: "error" })
    }
  }

  const confirmReject = async () => {
    if (!rejectingBooking) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch(`/api/bookings/${rejectingBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason }),
      })
      if (res.ok) {
        setRejectingBooking(null)
        setRejectionReason("")
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Rejection Failed", message: "Failed to reject booking.", type: "error" })
      }
    } catch (error) {
      console.error("Error rejecting:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error rejecting booking.", type: "error" })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const confirmReschedule = async () => {
    if (!reschedulingBooking || !rescheduleStart || !rescheduleEnd) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch(`/api/bookings/${reschedulingBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(rescheduleStart).toISOString(),
          endTime: new Date(rescheduleEnd).toISOString(),
        }),
      })
      if (res.ok) {
        setReschedulingBooking(null)
        setRescheduleStart("")
        setRescheduleEnd("")
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Reschedule Failed", message: "Failed to reschedule booking.", type: "error" })
      }
    } catch (error) {
      console.error("Error rescheduling:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error rescheduling booking.", type: "error" })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleUnbook = async (bookingId: string) => {
    if (!confirm("Are you sure you want to unbook and release this reservation?")) return
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchDashboardData()
      } else {
        setNotification({ isOpen: true, title: "Unbook Failed", message: "Failed to unbook reservation.", type: "error" })
      }
    } catch (error) {
      console.error("Error unbooking:", error)
      setNotification({ isOpen: true, title: "Error", message: "Error unbooking reservation.", type: "error" })
    }
  }

  const filteredQueue = queue.filter((item) => {
    if (filter === "conflicts") return item.hasConflict
    return true
  })

  // If unauthenticated or not manager, show friendly switcher
  if (authStatus === "unauthenticated" || (!isManager && authStatus === "authenticated")) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col justify-center items-center">
        <Card className="max-w-md w-full border-border shadow-xl text-center p-6 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Manager Access Required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The Approval Dashboard and Priority Sorting Queue require a **Workspace Manager**, **Admin**, or **Owner** account.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/auth/signin" className="block">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 h-auto shadow-md gap-2">
                <span>Sign In with Manager Account</span>
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full text-xs">
                ← Return to Floor Plan
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Universal Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-h-screen pb-20 md:pb-0",
          sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        )}
      >
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-30 px-3 sm:px-8 py-3.5 sm:py-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight leading-tight">
                  Manager Approvals
                </h1>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] sm:text-xs font-semibold">
                  Manager Mode
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Manage booking conflicts & priority queues</p>
            </div>
          </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border px-3 py-1.5 rounded-lg text-xs font-medium">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs cursor-pointer"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs font-medium gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span>
                  {filter === "all" ? "All Requests" : "Conflicts Only"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Filter Queue</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter("all")}>All Requests</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("conflicts")}>Conflicts Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

            {session?.user && (
              <div className="flex items-center gap-2 bg-muted/40 border border-border/80 px-2.5 py-1 rounded-xl shadow-xs">
                <Avatar className="h-6 w-6 rounded-lg ring-1 ring-purple-500/30">
                  <AvatarImage src={session.user.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[10px] rounded-lg">
                    {session.user.name ? session.user.name.split(" ").map((n: string) => n[0]).join("") : "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-xs font-bold text-foreground truncate max-w-[120px]">
                    {session.user.name}
                  </p>
                  <p className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold truncate max-w-[120px]">
                    {session.user.systemRole}
                  </p>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-1 p-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats.totalRooms}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-1 p-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bookings Today
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats.totalBookingsToday}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-1 p-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-yellow-600">
                Pending Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-yellow-600">{stats.pendingApprovals}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-1 p-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                Team Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">{pendingTeams.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
          <Button
            variant={activeTab === "bookings" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("bookings")}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl transition-all h-9 px-4",
              activeTab === "bookings" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Room Reservation Requests</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-extrabold", activeTab === "bookings" ? "bg-white/20 text-white border-white/30" : "bg-primary/10 text-primary border-primary/20")}>
              {stats.pendingApprovals}
            </Badge>
          </Button>

          <Button
            variant={activeTab === "teams" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("teams")}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl transition-all h-9 px-4",
              activeTab === "teams" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Team & Organization Requests</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-extrabold", activeTab === "teams" ? "bg-white/20 text-white border-white/30" : "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400")}>
              {pendingTeams.length}
            </Badge>
          </Button>

          <Button
            variant={activeTab === "roles" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("roles")}
            className={cn(
              "text-xs font-bold gap-2 rounded-xl transition-all h-9 px-4",
              activeTab === "roles" ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span>Custom Role Requests</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-extrabold", activeTab === "roles" ? "bg-white/20 text-white border-white/30" : "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30")}>
              {pendingCustomRoles.length}
            </Badge>
          </Button>
        </div>

        {/* TAB 2: Pending Team Creation Requests */}
        {activeTab === "teams" && (
          <Card className="border-purple-300 dark:border-purple-800 shadow-md bg-purple-500/5 overflow-hidden">
            <CardHeader className="p-5 border-b border-purple-200 dark:border-purple-800/60 bg-purple-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    New Organization / Team Requests ({pendingTeams.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tenant requests pending review. Approving will activate the organization and notify the creator via email.
                  </CardDescription>
                </div>
              </div>
            {pendingTeams.length > 0 && (
              <Badge className="bg-purple-600 text-white text-xs font-bold px-2.5 py-0.5">
                Action Required
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {pendingTeams.length === 0 ? (
              <div className="text-center py-16 p-4">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-foreground">No Pending Organization Requests</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  All team and organization creation requests have been reviewed and processed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingTeams.map((team) => {
                  const requesterName = team.members?.[0]?.user?.name || team.requestedBy || "Workspace User"
                  const requesterEmail = team.members?.[0]?.user?.email || team.requestedBy || ""
                  const roleTitle = team.members?.[0]?.customRoleTitle || "Founder / Lead"

                  return (
                    <div
                      key={team.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-card"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base text-foreground">{team.name}</h4>
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200 font-semibold">
                            Pending Approval
                          </Badge>
                        </div>
                        {team.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {team.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                          <span className="text-muted-foreground">
                            Requested by: <strong className="text-foreground">{requesterName}</strong> {requesterEmail ? `(${requesterEmail})` : ""}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-purple-600 border-purple-500/30 bg-purple-500/10">
                            Desired Role: {roleTitle}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={teamActionLoading === team.id}
                          onClick={() => setRejectingTeam(team)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={teamActionLoading === team.id}
                          onClick={() => handleApproveTeam(team.id)}
                          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {teamActionLoading === team.id ? "Approving..." : "Approve & Send Email"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* TAB 3: Pending Custom Role Requests */}
        {activeTab === "roles" && (
          <Card className="border-amber-300 dark:border-amber-800 shadow-md bg-amber-500/5 overflow-hidden">
            <CardHeader className="p-5 border-b border-amber-200 dark:border-amber-800/60 bg-amber-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    Custom Role Requests ({pendingCustomRoles.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    User custom role titles pending workspace manager authorization.
                  </CardDescription>
                </div>
              </div>
              {pendingCustomRoles.length > 0 && (
                <Badge className="bg-amber-600 text-white text-xs font-bold px-2.5 py-0.5">
                  Review Required
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {pendingCustomRoles.length === 0 ? (
                <div className="text-center py-16 p-4">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                  <h3 className="text-base font-bold text-foreground">No Pending Role Requests</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    All user custom role submissions have been authorized.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingCustomRoles.map((role) => (
                    <div key={role.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-foreground text-sm">{role.customRoleTitle}</span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 text-xs font-bold">
                            {role.team?.name || "Independent"}
                          </Badge>
                          {role.committeeName && (
                            <span className="text-xs text-muted-foreground">Committee: {role.committeeName}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requested by <strong>{role.user?.name || role.user?.email}</strong> ({role.user?.email})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRoleStatus(role.id, "APPROVED")}
                          disabled={teamActionLoading === role.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 rounded-xl shadow-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Approve Role
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRoleStatus(role.id, "REJECTED")}
                          disabled={teamActionLoading === role.id}
                          className="text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Refuse
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 1: Room Reservation Requests (Default Tab) */}
        {activeTab === "bookings" && (
          <Card className="border-border shadow-md">
          <CardHeader className="p-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Workspace Approval Queue ({filteredQueue.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Pending room reservation requests awaiting manager approval
              </CardDescription>
            </div>
            {queue.some((q) => q.hasConflict) && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {queue.filter((q) => q.hasConflict).length} Clashing Request(s)
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading queue...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-16 p-4">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-foreground">All caught up!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  There are no pending room booking requests for {formatDate(selectedDate)}.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[620px]">
                <div className="divide-y divide-border">
                  {filteredQueue.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-5 transition-colors hover:bg-muted/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
                        item.hasConflict && "bg-yellow-50/50 dark:bg-yellow-950/20"
                      )}
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-base text-foreground">{item.room.name}</h4>
                          <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                            {item.roleTitleUsed || "Member"}
                          </Badge>
                          {item.hasConflict && (
                            <Badge variant="destructive" className="text-xs font-semibold gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Time Slot Conflict
                            </Badge>
                          )}
                          <Badge variant="cash-pending" className="text-[10px]">
                            Cash on Arrival
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            {item.user.name} ({item.roleTitleUsed})
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {item.team.name}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border">
                            <span className="font-semibold text-muted-foreground">Purpose: </span>
                            {item.description}
                          </p>
                        )}

                        {item.conflictingApproved && item.conflictingApproved.length > 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-900 space-y-1.5">
                            <p className="font-bold flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-700" />
                              Clashes with approved booking:
                            </p>
                            {item.conflictingApproved.map((c) => (
                              <div key={c.id} className="flex items-center justify-between gap-2">
                                <p>
                                  • {c.team.name} ({formatTime(c.startTime)} - {formatTime(c.endTime)})
                                </p>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUnbook(c.id)}
                                  className="h-6 text-[10px] gap-1 px-2 rounded-md font-bold"
                                  title="Unbook existing approved reservation"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Unbook
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 text-xs h-9"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectingBooking(item)
                            setRejectionReason("")
                          }}
                          className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 text-xs h-9"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReschedulingBooking(item)
                            setRescheduleStart(new Date(item.startTime).toISOString().slice(0, 16))
                            setRescheduleEnd(new Date(item.endTime).toISOString().slice(0, 16))
                          }}
                          className="text-xs gap-1.5 h-9"
                        >
                          <Clock className="h-4 w-4" />
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        )}
      </main>

      {/* Team Rejection Dialog */}
      <Dialog open={Boolean(rejectingTeam)} onOpenChange={(open) => !open && setRejectingTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Decline Organization Request
            </DialogTitle>
            <DialogDescription>
              Provide an optional reason for declining &quot;{rejectingTeam?.name}&quot;. An automated notification will be sent to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="team-reject-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reason / Feedback
            </Label>
            <Input
              id="team-reject-reason"
              value={teamRejectionReason}
              onChange={(e) => setTeamRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate organization or does not meet workspace tenancy guidelines"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectingTeam(null)} disabled={Boolean(teamActionLoading)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejectTeam}
              disabled={Boolean(teamActionLoading)}
              className="gap-2"
            >
              {teamActionLoading ? "Declining..." : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Rejection Dialog */}
      <Dialog open={Boolean(rejectingBooking)} onOpenChange={(open) => !open && setRejectingBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Reject Booking Request
            </DialogTitle>
            <DialogDescription>
              Provide an optional reason or feedback for {rejectingBooking?.user.name}. An email will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rejection Reason / Feedback
            </Label>
            <Input
              id="reject-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Room booked for executive meeting, please pick another slot"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectingBooking(null)} disabled={isSubmittingAction}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={isSubmittingAction}
              className="gap-2"
            >
              {isSubmittingAction ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={Boolean(reschedulingBooking)} onOpenChange={(open) => !open && setReschedulingBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Reschedule Booking Slot
            </DialogTitle>
            <DialogDescription>
              Adjust start and end time for {reschedulingBooking?.room.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Start Time
              </Label>
              <Input
                type="datetime-local"
                value={rescheduleStart}
                onChange={(e) => setRescheduleStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New End Time
              </Label>
              <Input
                type="datetime-local"
                value={rescheduleEnd}
                onChange={(e) => setRescheduleEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReschedulingBooking(null)} disabled={isSubmittingAction}>
              Cancel
            </Button>
            <Button
              onClick={confirmReschedule}
              disabled={isSubmittingAction || !rescheduleStart || !rescheduleEnd}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold"
            >
              {isSubmittingAction ? "Saving..." : "Save Rescheduled Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teams Modal */}
      <TeamsModal isOpen={teamsModalOpen} onClose={() => setTeamsModalOpen(false)} />

      <SiteNotificationModal notification={notification} onClose={() => setNotification(null)} />
      </main>
    </div>
  )
}