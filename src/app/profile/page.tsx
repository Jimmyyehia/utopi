"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  Mail,
  Shield,
  Building2,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  UserCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInitials, cn, WORKSPACE_PRESET_ROLES, getCombinedRoleTitle } from "@/lib/utils"

import { SiteNotificationModal, NotificationState } from "@/components/ui/SiteNotificationModal"
import { ProfileVisualCustomizerModal, getVisualStyle } from "@/components/profile/ProfileVisualCustomizerModal"
import { Camera, Image as ImageIcon } from "lucide-react"

export default function ProfilePage() {
  const { data: session, status: authStatus, update: updateSession } = useSession()
  const [profileData, setProfileData] = useState<{
    user: any
    activeRoles: any[]
    pendingRoles: any[]
    pendingBookings: any[]
    allBookings: any[]
    pendingTeams: any[]
  } | null>(null)

  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [committeeName, setCommitteeName] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [customRoleInput, setCustomRoleInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  const handleSaveVisuals = async (newImage: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: newImage }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfileData((prev) => (prev ? { ...prev, user: { ...prev.user, ...updated.user } } : null))
        await updateSession()
        setNotification({
          isOpen: true,
          title: "Profile Picture Saved",
          message: "🎉 Your profile picture has been updated successfully!",
          type: "success",
        })
      } else {
        const errData = await res.json().catch(() => ({}))
        setNotification({
          isOpen: true,
          title: "Update Failed",
          message: errData.error || "Failed to update profile picture. Please try again.",
          type: "error",
        })
      }
    } catch (err) {
      console.error("Error saving profile picture:", err)
      setNotification({
        isOpen: true,
        title: "Error",
        message: "An unexpected error occurred while saving profile picture.",
        type: "error",
      })
    }
  }

  const isCustomRole = selectedRole === "__custom__"
  const finalRoleTitle = isCustomRole ? customRoleInput.trim() : selectedRole

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile")
      if (res.ok) {
        const data = await res.json()
        setProfileData(data)
      }
    } catch (err) {
      console.error("Error loading profile:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchProfile()
      fetch("/api/teams")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTeams(data.map((t: any) => ({ id: t.id, name: t.name })))
          }
        })
        .catch(() => {})
    } else if (authStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [authStatus])

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (isCustomRole && !customRoleInput.trim()) {
      setErrorMessage("Please enter a custom role title.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId || undefined,
          committeeName: committeeName.trim() || undefined,
          customRoleTitle: finalRoleTitle,
          isCustomRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to add role.")
      }

      setSuccessMessage(data.message)
      setCommitteeName("")
      setCustomRoleInput("")
      setSelectedRole("Member")
      fetchProfile()
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this role from your profile?")) return
    setActionLoadingId(roleId)
    try {
      const res = await fetch(`/api/profile/roles/${roleId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchProfile()
      } else {
        setNotification({
          isOpen: true,
          title: "Action Failed",
          message: "Failed to remove role from your profile.",
          type: "error",
        })
      }
    } catch (err) {
      console.error("Error removing role:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        <AppSidebar />
        <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Please log in or select a persona to view your user profile space and role manager.
          </p>
          <Link href="/auth/signin">
            <Button className="bg-primary text-primary-foreground font-bold rounded-xl text-xs px-6">
              Sign In to Your Account
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row max-w-full overflow-x-hidden">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300 max-w-full overflow-x-hidden">
        {/* Top Bar Header */}
        <header className="h-16 border-b border-border px-4 sm:px-6 flex items-center justify-between bg-card sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                My Profile & Role Manager
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Manage your user identity, active team titles, and track pending requests
              </p>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <div className="p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* High Authority Banner for Workspace Higher Roles */}
          {isManager && (
            <Card className="border border-purple-300 dark:border-purple-800 bg-purple-500/10 shadow-xs rounded-3xl overflow-hidden">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600 text-white font-bold text-xs uppercase px-2.5 py-0.5">
                      High-Level Workspace Authority
                    </Badge>
                    <h3 className="text-sm font-extrabold text-foreground">
                      {session?.user?.systemRole === "OWNER" ? "Workspace Owner & Administrator" : "Workspace Manager"}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    You possess full administrative authority over all partner organizations, member role approvals, and room reservations across the entire workspace.
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl px-5 gap-2 shadow-sm whitespace-nowrap">
                    <Shield className="h-4 w-4" />
                    Open Approvals Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* User Info Card */}
          <Card className="border border-border/80 shadow-xs overflow-hidden rounded-3xl bg-card">
            <CardContent className="p-6 bg-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-5">
                <div className="flex items-center gap-4">
                  {/* Dynamic Avatar PFP */}
                  <div className="relative group">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-primary/20 overflow-hidden transition-all text-white flex-shrink-0"
                      style={getVisualStyle(profileData?.user?.image, "linear-gradient(to top right, #9333ea, #6366f1)")}
                    >
                      {profileData?.user?.image?.startsWith("http") || profileData?.user?.image?.startsWith("data:") ? (
                        <img src={profileData.user.image} alt={session?.user?.name || "PFP"} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(session?.user?.name || session?.user?.email || "U")
                      )}
                    </div>
                    <button
                      onClick={() => setCustomizerOpen(true)}
                      className="absolute inset-0 bg-black/55 text-white rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[10px] font-bold gap-1 border-2 border-transparent"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {session?.user?.name || "Workspace Member"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground/80" />
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomizerOpen(true)}
                    className="h-9 text-xs font-bold rounded-xl gap-1.5 border-border shadow-2xs"
                  >
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    Change Profile Photo
                  </Button>
                  <Badge
                    variant="outline"
                    className="px-3.5 py-1.5 bg-primary/10 text-primary border-primary/30 font-extrabold text-xs uppercase tracking-wider rounded-xl"
                  >
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    {session?.user?.systemRole || "USER"}
                  </Badge>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60 text-xs">
                {isManager ? (
                  <>
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 uppercase font-bold tracking-wider block">
                        Authority Level
                      </span>
                      <span className="text-base font-extrabold text-purple-800 dark:text-purple-200">
                        {session?.user?.systemRole || "MANAGER"}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Management Scope
                      </span>
                      <span className="text-base font-extrabold text-foreground">
                        Global Workspace
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Total Bookings
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {profileData?.allBookings.length || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Privilege Level
                      </span>
                      <span className="text-base font-extrabold text-emerald-600">
                        Supreme / Unrestricted
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Active Roles
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {profileData?.activeRoles.length || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Pending Roles
                      </span>
                      <span className="text-lg font-black text-amber-600">
                        {profileData?.pendingRoles.length || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Pending Bookings
                      </span>
                      <span className="text-lg font-black text-primary">
                        {profileData?.pendingBookings.length || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Total Bookings
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {profileData?.allBookings.length || 0}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conditional Left Card: Governance Panel for Managers, Add Role Form for Regular Members */}
            {isManager ? (
              <Card className="lg:col-span-1 border border-purple-300 dark:border-purple-800/60 shadow-xs rounded-3xl h-fit bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Management System Authority
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Administrative governance and workspace privileges.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
                    <span className="font-extrabold text-foreground block text-xs">
                      Granted Privileges:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Instant Auto-Approved Room Reservations</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Organization & Custom Role Approvals</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Unrestricted Access to All Workspace Teams</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Incognito Private Booking Details Unmasked</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:col-span-1 border border-border/80 shadow-xs rounded-3xl h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add Role to Profile
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Request a Workspace Standardized Role or submit a Custom Role for manager review.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddRole} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Organization</Label>
                      <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="" disabled>Select an Organization</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Committee (Optional)</Label>
                      <Input
                        placeholder="e.g. AI, PR, Competitive Coding"
                        value={committeeName}
                        onChange={(e) => setCommitteeName(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Role Title</Label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="" disabled>Select a Role Title</option>
                        {WORKSPACE_PRESET_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                        <option value="__custom__">+ Custom Role (Pending)</option>
                      </select>
                    </div>

                    {isCustomRole && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-semibold text-foreground">Custom Role Title *</Label>
                        <Input
                          placeholder="e.g. Chief Innovation Architect"
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                        <p className="text-[11px] text-amber-600 font-medium pt-0.5">
                          ⏳ Custom roles are submitted to workspace management for review.
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={!selectedTeamId || !selectedRole || (isCustomRole && !customRoleInput.trim()) || isSubmitting}
                      className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : !selectedTeamId
                        ? "Select a Team First"
                        : !selectedRole
                        ? "Select a Role Title"
                        : isCustomRole
                        ? "Request Custom Role"
                        : "Add Role to Profile"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Active & Pending Roles Directory for Members / System Scope for Managers */}
            <Card className="lg:col-span-2 border border-border/80 shadow-xs rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {isManager ? "Workspace Administrative Scope" : "My Active & Assigned Roles"}
                  </span>
                  {!isManager && (
                    <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30">
                      {profileData?.activeRoles.length || 0} Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isManager
                    ? "Workspace-wide system administration overview."
                    : "Role titles associated with your profile across organizations."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isManager ? (
                  <div className="p-6 border border-border rounded-2xl bg-muted/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground">
                          {session?.user?.systemRole === "OWNER" ? "Workspace Owner & Root Administrator" : "Workspace Manager"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          You operate at the highest authority level. You do not belong to individual member teams, giving you impartial governance across all teams and workspace spaces.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading profile roles...</div>
                ) : profileData?.activeRoles.length === 0 ? (
                  <div className="p-8 border border-dashed border-border rounded-2xl text-center space-y-2">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-xs font-bold text-foreground">No active roles assigned</p>
                    <p className="text-[11px] text-muted-foreground">
                      Use the form on the left to add a Workspace Standardized Role to your profile.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {profileData?.activeRoles.map((role) => (
                      <div
                        key={role.id}
                        className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/50 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-extrabold text-foreground truncate">
                            {getCombinedRoleTitle(role.customRoleTitle, role.committeeName)}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-primary/10 text-primary border-primary/20">
                              {role.team?.name || "Independent"}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRole(role.id)}
                          disabled={actionLoadingId === role.id}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          title="Remove Role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Custom Role Requests Section */}
                {profileData?.pendingRoles && profileData.pendingRoles.length > 0 && (
                  <div className="pt-4 border-t border-border/60 space-y-3">
                    <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Pending Custom Role Requests ({profileData.pendingRoles.length})
                    </h3>
                    <div className="grid gap-2">
                      {profileData.pendingRoles.map((role) => (
                        <div
                          key={role.id}
                          className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-foreground block">{getCombinedRoleTitle(role.customRoleTitle, role.committeeName)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {role.team?.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30 text-[10px] font-bold">
                            Pending Manager Approval
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Activity & Pending Requests Section (Regular Members Only) */}
          {!isManager && (
            <Card className="border border-border/80 shadow-xs rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    My Pending Requests & Activity Tracker
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Track room reservation requests, pending team creations, and custom role submissions in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileData?.pendingBookings.length === 0 && profileData?.pendingTeams.length === 0 && profileData?.pendingRoles.length === 0 ? (
                  <div className="p-8 border border-dashed border-border rounded-2xl text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-foreground">No Pending Requests</p>
                    <p className="text-[11px] text-muted-foreground">
                      All your reservations and role requests are fully processed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Pending Bookings List */}
                    {profileData?.pendingBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-foreground">{b.projectOrCommitteeName}</span>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                              {b.room?.name || "Room"}
                            </Badge>
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 text-[10px] font-bold">
                              Pending Manager Approval
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(b.startTime).toLocaleDateString()} • {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Pending Teams List */}
                    {profileData?.pendingTeams.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-foreground">Organization Request: {t.name}</span>
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400 text-[10px] font-bold">
                              Pending Workspace Approval
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {t.description || "No description provided"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteNotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ProfileVisualCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        currentImage={profileData?.user?.image}
        userName={session?.user?.name || session?.user?.email}
        onSave={handleSaveVisuals}
      />
    </div>
  )
}
