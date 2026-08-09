"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { UserCheck, Sparkles, ArrowRight, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const DEMO_PERSONAS = [
  {
    name: "Alex Manager",
    email: "manager@utopi.space",
    role: "WORKSPACE_MANAGER",
    badge: "Manager / Approver",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full manager privileges, approval queue sorting, and conflict resolution",
    avatarBg: "from-purple-500 to-indigo-600",
  },
  {
    name: "Alice Chen",
    email: "alice@hawkinsight.com",
    role: "PR Head @ Hawk Insight",
    badge: "High Priority (Score: 100)",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    description: "Has dual roles (PR Head & Technical Lead) at Hawk Insight",
    avatarBg: "from-teal-500 to-emerald-600",
  },
  {
    name: "Bob Martinez",
    email: "bob@hawkinsight.com",
    role: "Senior Designer @ Hawk Insight",
    badge: "Priority: 70",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Design committee member at Hawk Insight",
    avatarBg: "from-blue-500 to-cyan-600",
  },
  {
    name: "Carol Kim",
    email: "carol@nexuslabs.com",
    role: "AI Research Lead @ Nexus Labs",
    badge: "Priority: 90",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "AI Research committee lead at Nexus Labs",
    avatarBg: "from-emerald-500 to-teal-700",
  },
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("password")
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleQuickLogin = async (personaEmail: string) => {
    setLoadingEmail(personaEmail)
    setErrorMessage(null)
    try {
      const res = await signIn("credentials", {
        email: personaEmail,
        password: "demo-password",
        redirect: false,
      })

      if (res?.error) {
        setErrorMessage("Authentication failed. Please check credentials.")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage("Unexpected error during login.")
    } finally {
      setLoadingEmail(null)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    await handleQuickLogin(email)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl space-y-8"
    >
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Utopi — Your Innovation Space</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Sign In & Choose Persona
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
          Select a seeded demo account below for one-click testing or sign in with your email.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium max-w-md mx-auto">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Quick Persona Cards (7 cols) */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              One-Click Demo Personas
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Click to log in</span>
          </div>

          <div className="grid gap-3">
            {DEMO_PERSONAS.map((persona) => {
              const isLoading = loadingEmail === persona.email
              return (
                <motion.div
                  key={persona.email}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                    onClick={() => !loadingEmail && handleQuickLogin(persona.email)}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${persona.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0`}>
                          {persona.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                              {persona.name}
                            </h3>
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 border font-semibold ${persona.badgeColor}`}>
                              {persona.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{persona.role}</p>
                          <p className="text-[11px] text-muted-foreground/80 hidden sm:block mt-1">{persona.description}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(loadingEmail)}
                        className="h-8 w-8 p-0 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0"
                      >
                        {isLoading ? (
                          <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Standard Credentials Card (5 cols) */}
        <div className="md:col-span-5">
          <Card className="border-border shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Credentials Sign In
              </CardTitle>
              <CardDescription className="text-xs">
                Enter an existing user account email to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="manager@utopi.space"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={Boolean(loadingEmail)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 h-auto shadow-md"
                >
                  {loadingEmail === email ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <span>Sign In with Email</span>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                    onClick={() => router.push("/")}
                  >
                    ← Back to Interactive Floor Plan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
