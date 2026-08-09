"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
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
} from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePriorityScore } from "@/lib/utils"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accountType, setAccountType] = useState<"member" | "management">("member")
  const [systemRole, setSystemRole] = useState<"USER" | "WORKSPACE_MANAGER" | "ADMIN">("USER")

  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [isCreatingNewTeam, setIsCreatingNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")

  const [committeeName, setCommitteeName] = useState("Engineering")
  const [customRoleTitle, setCustomRoleTitle] = useState("Member")

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
          setTeams(uniqueTeams)
          if (uniqueTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(uniqueTeams[0].id)
          }
        }
      })
      .catch(() => {
        setTeams([
          { id: "hawk-insight", name: "Hawk Insight" },
          { id: "nexus-labs", name: "Nexus Labs" },
        ])
        setSelectedTeamId("hawk-insight")
      })
  }, [selectedTeamId])

  const calculatedScore = calculatePriorityScore(customRoleTitle)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Please fill in all required fields.")
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        systemRole: accountType === "management" ? systemRole : "USER",
        teamId: isCreatingNewTeam ? undefined : selectedTeamId,
        newTeamName: isCreatingNewTeam ? newTeamName.trim() : undefined,
        newTeamDescription: isCreatingNewTeam ? newTeamDescription.trim() : undefined,
        committeeName: accountType === "member" ? committeeName.trim() : undefined,
        customRoleTitle: accountType === "member" ? customRoleTitle.trim() : undefined,
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

      setSuccessMessage("Account created successfully! Logging you in...")

      await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg space-y-6"
      >
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
            Get instant access to room reservations, committee priority scheduling, and real-time floor plans.
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
                    <span>Tenant Member</span>
                  </div>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">
                    Team member with priority score
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
                    Auto-approved direct authority
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

              {/* Member specific team & committee */}
              {accountType === "member" && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Organization</Label>
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
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Committee</Label>
                      <Input
                        placeholder="e.g. PR, AI, Design"
                        value={committeeName}
                        onChange={(e) => setCommitteeName(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">Role Title</Label>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-bold text-primary border-primary/30">
                          Score: {calculatedScore}
                        </Badge>
                      </div>
                      <Input
                        placeholder="e.g. Lead, Senior, Head"
                        value={customRoleTitle}
                        onChange={(e) => setCustomRoleTitle(e.target.value)}
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>
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
      </motion.div>
    </div>
  )
}
