"use client"

import { Suspense, useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Shield,
  Building2,
  UserCheck,
  CheckCircle2,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

interface FastLoginUser {
  name: string
  email: string
  roleBadge: string
  roleCategory: "management" | "tenant" | "custom"
  orgName: string
  roleTitle: string
}

const PRESET_ACCOUNTS: FastLoginUser[] = [
  {
    name: "Omar Farooq",
    email: "owner@utopi.space",
    roleBadge: "Owner",
    roleCategory: "management",
    orgName: "Utopi Global",
    roleTitle: "Workspace Owner",
  },
  {
    name: "Alex Manager",
    email: "manager@utopi.space",
    roleBadge: "Manager",
    roleCategory: "management",
    orgName: "Utopi Operations",
    roleTitle: "Workspace Operations Manager",
  },
  {
    name: "Admin User",
    email: "admin@utopi.space",
    roleBadge: "Admin",
    roleCategory: "management",
    orgName: "Utopi Systems",
    roleTitle: "System Administrator",
  },
  {
    name: "Alice Chen",
    email: "alice@hawkinsight.com",
    roleBadge: "PR Head",
    roleCategory: "tenant",
    orgName: "Hawk Insight",
    roleTitle: "PR Head & Tech Lead",
  },
  {
    name: "Bob Martinez",
    email: "bob@hawkinsight.com",
    roleBadge: "Senior",
    roleCategory: "tenant",
    orgName: "Hawk Insight",
    roleTitle: "Senior Designer",
  },
  {
    name: "Carol Kim",
    email: "carol@nexuslabs.com",
    roleBadge: "Lead",
    roleCategory: "tenant",
    orgName: "Nexus Labs",
    roleTitle: "AI Research Lead",
  },
  {
    name: "David Park",
    email: "david@freelancer.com",
    roleBadge: "Guest",
    roleCategory: "tenant",
    orgName: "Nexus Labs",
    roleTitle: "Guest Contributor",
  },
  {
    name: "Tarek Mansour",
    email: "tarek@hackerrank-aufs.org",
    roleBadge: "President",
    roleCategory: "tenant",
    orgName: "HackerRank AUFS",
    roleTitle: "Chapter President",
  },
  {
    name: "Karim Zaki",
    email: "karim@phd-case.org",
    roleBadge: "Director",
    roleCategory: "tenant",
    orgName: "PHD",
    roleTitle: "Executive Director",
  },
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUserEmail, setLoadingUserEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dbUsers, setDbUsers] = useState<FastLoginUser[]>([])

  // Fetch dynamic users from DB to include any user created by registration
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const fetchedUsers: FastLoginUser[] = data.map((u: any) => {
            const firstRole = u.teamRoles && u.teamRoles[0]
            const orgName = firstRole?.team?.name || (u.systemRole === "OWNER" || u.systemRole === "WORKSPACE_MANAGER" || u.systemRole === "ADMIN" ? "Management" : "Independent")
            const roleTitle = firstRole?.customRoleTitle || u.systemRole
            const isMgmt = u.systemRole === "OWNER" || u.systemRole === "WORKSPACE_MANAGER" || u.systemRole === "ADMIN"

            return {
              name: u.name || "Workspace Member",
              email: u.email,
              roleBadge: u.systemRole === "OWNER" ? "Owner" : u.systemRole === "WORKSPACE_MANAGER" ? "Manager" : u.systemRole === "ADMIN" ? "Admin" : (firstRole?.customRoleTitle || "Member"),
              roleCategory: isMgmt ? "management" : "tenant",
              orgName,
              roleTitle,
            }
          })

          // Merge preset list with dynamic users without duplicates
          const seen = new Set<string>()
          const combined: FastLoginUser[] = []

          // Add DB users first
          for (const u of fetchedUsers) {
            const norm = u.email.toLowerCase().trim()
            if (!seen.has(norm)) {
              seen.add(norm)
              combined.push(u)
            }
          }

          // Add any missing preset testing accounts
          for (const p of PRESET_ACCOUNTS) {
            const norm = p.email.toLowerCase().trim()
            if (!seen.has(norm)) {
              seen.add(norm)
              combined.push(p)
            }
          }

          setDbUsers(combined)
        } else {
          setDbUsers(PRESET_ACCOUNTS)
        }
      })
      .catch(() => {
        setDbUsers(PRESET_ACCOUNTS)
      })
  }, [])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    setIsLoading(true)

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      if (res?.error) {
        setErrorMessage("Invalid email or password. Please try again.")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFastLogin = async (userEmail: string) => {
    setErrorMessage(null)
    setLoadingUserEmail(userEmail)

    try {
      const res = await signIn("credentials", {
        email: userEmail.trim(),
        password: "password123",
        redirect: false,
      })

      if (res?.error) {
        // Fallback test password try
        const res2 = await signIn("credentials", {
          email: userEmail.trim(),
          password: "Utopi2026!",
          redirect: false,
        })
        if (res2?.error) {
          setErrorMessage(`Unable to fast login to ${userEmail}. Use standard login credentials.`)
          return
        }
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setErrorMessage("Fast login failed. Please try again.")
    } finally {
      setLoadingUserEmail(null)
    }
  }

  const displayedUsers = dbUsers.length > 0 ? dbUsers : PRESET_ACCOUNTS
  const managementUsers = displayedUsers.filter((u) => u.roleCategory === "management")
  const tenantUsers = displayedUsers.filter((u) => u.roleCategory === "tenant")

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Utopi Workspace Authentication</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Welcome to Utopi
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto">
          Sign in to access real-time room blueprints, manage committee priority reservations, and review approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Standard Credentials Login */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-xl bg-card rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 pt-6 px-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Lock className="h-4 w-4 text-primary" />
                <span>Standard Sign In</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter your work email and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-10 text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || loadingUserEmail !== null}
                  className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 text-primary-foreground font-bold h-10 rounded-xl shadow-md gap-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-1.5">
                  <p>
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/signup" className="text-primary font-bold hover:underline">
                      Create User Account
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 1-Click Fast Login for All Database & Preset Accounts */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-xl bg-card rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 pt-6 px-6 border-b border-border/50 bg-gradient-to-r from-purple-500/10 via-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>1-Click Instant Login (All Accounts)</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {displayedUsers.length} Active Personas
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Click any account below to immediately sign in and switch identities.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Management Accounts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Shield className="h-3.5 w-3.5 text-purple-600" />
                  <span>Workspace Leadership & Management</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {managementUsers.map((u) => {
                    const isSigningIn = loadingUserEmail === u.email
                    return (
                      <button
                        key={u.email}
                        type="button"
                        disabled={loadingUserEmail !== null || isLoading}
                        onClick={() => handleFastLogin(u.email)}
                        className="p-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 hover:border-purple-500/40 text-left transition-all duration-200 shadow-xs flex flex-col justify-between group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 rounded-xl ring-1 ring-purple-500/30">
                            <AvatarFallback className="bg-purple-600 text-white font-bold text-xs">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                              {u.name}
                            </p>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold text-purple-600 border-purple-500/30 bg-purple-500/10">
                              {u.roleBadge}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-purple-500/10 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground truncate">{u.orgName}</span>
                          <span className="font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
                            {isSigningIn ? "Logging in..." : "Login →"}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tenant Organizations & Members */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Tenant Teams & Active Members</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {tenantUsers.map((u) => {
                    const isSigningIn = loadingUserEmail === u.email
                    return (
                      <button
                        key={u.email}
                        type="button"
                        disabled={loadingUserEmail !== null || isLoading}
                        onClick={() => handleFastLogin(u.email)}
                        className="p-3 rounded-2xl border border-border hover:border-primary/40 bg-card hover:bg-primary/5 text-left transition-all duration-200 shadow-xs flex items-center justify-between group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 rounded-xl ring-1 ring-primary/30">
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {u.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {u.orgName} • <span className="font-medium text-foreground">{u.roleTitle}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                            {isSigningIn ? "Logging in..." : "Login →"}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  )
}
