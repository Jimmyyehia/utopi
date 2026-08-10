"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  UserPlus,
  Building2,
  Lock,
  Mail,
  User,
  Sparkles,
  Shield,
  CheckCircle2,
  ArrowRight,
  Clock,
} from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const PREDETERMINED_ROLES = [
  "Member",
  "Senior Member",
  "Lead / Coordinator",
  "Head of Committee",
  "Director / President",
  "Founder / Co-Founder",
  "Guest / Contributor",
]

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accountType, setAccountType] = useState<"member" | "management">("member")
  const [systemRole, setSystemRole] = useState<"USER" | "WORKSPACE_MANAGER" | "ADMIN">("USER")

  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([
    { id: "hawk-insight", name: "Hawk Insight" },
    { id: "hackerrank-aufs", name: "HackerRank AUFS" },
    { id: "phd", name: "PHD" },
    { id: "nexus-labs", name: "Nexus Labs" },
  ])
  // Empty by default: independent user
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [isCreatingNewTeam, setIsCreatingNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")

  const [committeeName, setCommitteeName] = useState("Engineering")
  const [selectedRole, setSelectedRole] = useState<string>("Member")
  const [customRoleInput, setCustomRoleInput] = useState<string>("")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const uniqueTeams = Array.from(
            new Map(data.map((t: any) => [t.id || t.teamId, { id: t.id || t.teamId, name: t.name || t.team?.name }])).values()
          )
          if (uniqueTeams.length > 0) {
            setTeams(uniqueTeams)
          }
        }
      })
      .catch(() => {})
  }, [])

  const isCustomRole = selectedRole === "__custom__"
  const finalRoleTitle = isCustomRole ? customRoleInput.trim() : selectedRole

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Please fill in all required fields.")
      return
    }

    if ((selectedTeamId || isCreatingNewTeam) && isCustomRole && !customRoleInput.trim()) {
      setErrorMessage("Please specify your desired custom role title.")
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        systemRole: accountType === "management" ? systemRole : "USER",
        teamId: isCreatingNewTeam ? undefined : (selectedTeamId || undefined),
        newTeamName: isCreatingNewTeam ? newTeamName.trim() : undefined,
        newTeamDescription: isCreatingNewTeam ? newTeamDescription.trim() : undefined,
        committeeName: accountType === "member" && (selectedTeamId || isCreatingNewTeam) ? committeeName.trim() : undefined,
        customRoleTitle: accountType === "member" && (selectedTeamId || isCreatingNewTeam) ? finalRoleTitle : undefined,
        roleStatus: isCustomRole ? "PENDING" : "APPROVED",
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.")
      }

      if (isCustomRole) {
        setSuccessMessage("Account created! Your custom role has been submitted for manager review.")
      } else {
        setSuccessMessage("Account created successfully! Logging you in...")
      }

      await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1200)
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Top Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Join Utopi Innovation Space</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Create Your Account
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Get instant access to room reservations, committee scheduling, and real-time floor plans.
          </p>
        </div>

        <Card className="border-border shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Registration Details
            </CardTitle>
            <CardDescription className="text-xs">
              Fill out your member profile below
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Account Type Toggle */}
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
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Workspace Member</span>
                  </div>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">
                    Independent or tenant organization
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
                    <Shield className="h-3.5 w-3.5" />
                    <span>Management</span>
                  </div>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">
                    Manager or Admin authority
                  </p>
                </button>
              </div>

              {/* Basic Fields */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="alex@team.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Member specific organization & role */}
              {accountType === "member" && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Organization (Optional)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewTeam(!isCreatingNewTeam)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {isCreatingNewTeam ? "← Select Existing" : "+ Create New Team"}
                    </button>
                  </div>

                  {isCreatingNewTeam ? (
                    <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border">
                      <Input
                        placeholder="Organization Name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="h-8 text-xs bg-background"
                        required
                      />
                      <Input
                        placeholder="Department or Domain"
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  ) : (
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="">-- None (Independent / Not assigned to a team) --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Show committee and role options if a team is selected or being created */}
                  {(selectedTeamId || isCreatingNewTeam) && (
                    <div className="space-y-3 p-3 bg-muted/40 rounded-2xl border border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Committee</Label>
                          <Input
                            placeholder="e.g. PR, AI, Design"
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
                            {PREDETERMINED_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                            <option value="__custom__">+ Custom Role (Pending Approval)</option>
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
                              placeholder="e.g. Chief Research Architect"
                              value={customRoleInput}
                              onChange={(e) => setCustomRoleInput(e.target.value)}
                              className="h-9 text-xs bg-background"
                              required
                            />
                          </div>
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                            <span>
                              Your account will be created immediately. The custom role will appear as <strong>Pending Approval</strong> until confirmed by management.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-bold gap-2 shadow-md bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 text-white mt-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <span>Create Account & Start Booking</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2 text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-primary font-semibold hover:underline">
                  Sign In here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
