"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserPlus,
  Building2,
  Lock,
  Mail,
  User,
  Sparkles,
  Shield,
  CheckCircle2,
  X,
  Clock,
} from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface TeamOption {
  id: string
  name: string
}

const DEFAULT_WORKSPACE_TEAMS: TeamOption[] = [
  { id: "hacker-rank-aufs", name: "HackerRank AUFS" },
  { id: "hawk-insight", name: "Hawk Insight" },
  { id: "nexus-labs", name: "Nexus Labs" },
  { id: "phd", name: "PHD" },
]

export const WORKSPACE_PRESET_ROLES = [
  "Founder",
  "Head",
  "President",
  "Project Manager",
  "Vice Head",
  "Vice President",
  "Vice Project Manager",
]

export const PREDETERMINED_ROLES = [
  "Founder",
  "Head",
  "President",
  "Project Manager",
  "Vice Head",
  "Vice President",
  "Vice Project Manager",
]

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onRequestNewTeam?: () => void
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  onRequestNewTeam,
}: CreateUserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accountType, setAccountType] = useState<"member" | "management" | "guest">("member")
  const [systemRole, setSystemRole] = useState<"USER" | "WORKSPACE_MANAGER" | "ADMIN">("USER")

  const [teams, setTeams] = useState<TeamOption[]>(DEFAULT_WORKSPACE_TEAMS)
  // Not required by default: empty string means independent / no team
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")

  const [committeeName, setCommitteeName] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [customRoleInput, setCustomRoleInput] = useState<string>("")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch all approved workspace teams dynamically from the database
  useEffect(() => {
    if (isOpen) {
      fetch("/api/teams")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const dynamicTeams: TeamOption[] = data
              .filter((t: any) => t.status === "APPROVED" || !t.status)
              .map((t: any) => ({
                id: t.id,
                name: t.name,
              }))
            if (dynamicTeams.length > 0) {
              setTeams(dynamicTeams)
            }
          }
        })
        .catch(() => {
          setTeams(DEFAULT_WORKSPACE_TEAMS)
        })
    }
  }, [isOpen])

  const isCustomRole = selectedRole === "__custom__"
  const finalRoleTitle = isCustomRole ? customRoleInput.trim() : selectedRole

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Please fill in all required fields (Name, Email, Password).")
      return
    }

    if (selectedTeamId && isCustomRole && !customRoleInput.trim()) {
      setErrorMessage("Please specify your desired custom role title.")
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        systemRole: accountType === "management" ? systemRole : accountType === "guest" ? "GUEST" : "USER",
        teamId: accountType === "member" && selectedTeamId ? selectedTeamId : undefined,
        committeeName: accountType === "member" && selectedTeamId ? committeeName.trim() : undefined,
        customRoleTitle: accountType === "member" && selectedTeamId ? finalRoleTitle : accountType === "guest" ? "Guest Contributor" : undefined,
        roleStatus: isCustomRole ? "PENDING" : "APPROVED",
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.")
      }

      if (isCustomRole) {
        setSuccessMessage("Account created! Your custom role has been submitted for manager approval.")
      } else {
        setSuccessMessage("Account created! Signing you in...")
      }

      // Auto sign in as the newly created user
      await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      setTimeout(() => {
        onSuccess?.()
        onClose()
        window.location.reload()
      }, 1200)
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Create User Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Register an organization member, independent user, or management profile
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Account Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("member")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    accountType === "member"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Building2 className="h-4 w-4" />
                    <span>Workspace Member</span>
                  </div>
                  <p className="text-[11px] font-normal opacity-80 mt-1">
                    Independent or community organization member
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("management")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    accountType === "management"
                      ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Shield className="h-4 w-4" />
                    <span>Management Authority</span>
                  </div>
                  <p className="text-[11px] font-normal opacity-80 mt-1">
                    Manager or Admin authority
                  </p>
                </button>
              </div>

              {/* Management Authority Review Notice */}
              {accountType === "management" && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 text-xs flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">High-Level Authority Review Required:</span> Creating a management account requires review and authorization by the Workspace Owner before management privileges are activated.
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-name" className="text-xs font-semibold text-muted-foreground">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="user-name"
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email" className="text-xs font-semibold text-muted-foreground">
                  Work Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="sarah@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-pass" className="text-xs font-semibold text-muted-foreground">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="user-pass"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Member Organization Selector (Optional) */}
            {accountType === "member" ? (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Organization (Optional)
                    </Label>
                    {onRequestNewTeam && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onRequestNewTeam()
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        + Request New Organization
                      </button>
                    )}
                  </div>
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

                {/* Show Committee and Role selection only if an organization is chosen */}
                {selectedTeamId ? (
                  <div className="space-y-3 p-3 bg-muted/40 rounded-2xl border border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Committee</Label>
                        <Input
                          placeholder="e.g. PR, Engineering"
                          value={committeeName}
                          onChange={(e) => setCommitteeName(e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="" disabled>Select a Role Title</option>
                          {PREDETERMINED_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Role (Pending)</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Role Input */}
                    {isCustomRole && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Custom Role Title *
                          </Label>
                          <Input
                            placeholder="e.g. Chief Innovation Architect"
                            value={customRoleInput}
                            onChange={(e) => setCustomRoleInput(e.target.value)}
                            className="h-9 text-xs bg-background"
                            required
                          />
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <span>
                            Your account will be created immediately. The custom role will show as <strong>Pending Approval</strong> until confirmed by a workspace manager.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    Independent members can browse rooms and submit reservations directly.
                  </p>
                )}
              </div>
            ) : (
              /* Management Specific Role Selection */
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold text-muted-foreground">Management Authority Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSystemRole("WORKSPACE_MANAGER")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      systemRole === "WORKSPACE_MANAGER"
                        ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Workspace Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setSystemRole("ADMIN")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      systemRole === "ADMIN"
                        ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    System Admin
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-bold gap-2 shadow-md bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 text-white rounded-xl"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Create User & Sign In</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
