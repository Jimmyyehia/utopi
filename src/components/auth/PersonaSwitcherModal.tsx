"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserCheck,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle,
  ArrowRight,
  Crown,
  Layers,
  UserPlus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn, calculatePriorityScore } from "@/lib/utils"
import { CreateUserModal } from "./CreateUserModal"

export interface Persona {
  id: string
  name: string
  email: string
  systemRole: "USER" | "WORKSPACE_MANAGER" | "ADMIN" | "OWNER"
  teamName?: string
  roles: Array<{
    title: string
    committee?: string | null
    priorityScore?: number
  }>
  avatarGradient: string
  highlightBadge: string
  highlightColor: string
  description: string
}

export const ALL_PERSONAS: Persona[] = [
  {
    id: "user-owner",
    name: "Omar Farooq",
    email: "owner@utopi.space",
    systemRole: "OWNER",
    roles: [
      {
        title: "Workspace Owner",
        committee: null,
      },
    ],
    avatarGradient: "from-amber-500 via-orange-500 to-yellow-600",
    highlightBadge: "Workspace Owner",
    highlightColor: "bg-amber-100 text-amber-900 border-amber-300",
    description: "Ultimate workspace owner with full override authority, automatic booking approval, and room unbooking permissions.",
  },
  {
    id: "user-manager",
    name: "Alex Manager",
    email: "manager@utopi.space",
    systemRole: "WORKSPACE_MANAGER",
    roles: [
      {
        title: "Workspace Manager",
        committee: null,
      },
    ],
    avatarGradient: "from-purple-500 to-indigo-600",
    highlightBadge: "Workspace Manager",
    highlightColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Workspace manager with full management controls, automatic booking approval, and room conflict resolution.",
  },
  {
    id: "user-admin",
    name: "Admin User",
    email: "admin@utopi.space",
    systemRole: "ADMIN",
    roles: [
      {
        title: "System Administrator",
        committee: null,
      },
    ],
    avatarGradient: "from-slate-700 to-zinc-900",
    highlightBadge: "System Admin",
    highlightColor: "bg-zinc-100 text-zinc-800 border-zinc-300",
    description: "System administrator with root platform configuration and automatic booking approval.",
  },
  {
    id: "user-1",
    name: "Alice Chen",
    email: "alice@hawkinsight.com",
    systemRole: "USER",
    teamName: "Hawk Insight",
    roles: [
      {
        title: "PR Head",
        committee: "PR",
        priorityScore: 100,
      },
      {
        title: "Technical Lead",
        committee: "Engineering",
        priorityScore: 90,
      },
    ],
    avatarGradient: "from-teal-500 to-emerald-600",
    highlightBadge: "Dual Role • Head (100)",
    highlightColor: "bg-teal-100 text-teal-800 border-teal-200",
    description: "Holds multiple roles across PR and Engineering at Hawk Insight with high priority booking privileges.",
  },
  {
    id: "user-3",
    name: "Carol Kim",
    email: "carol@nexuslabs.com",
    systemRole: "USER",
    teamName: "Nexus Labs",
    roles: [
      {
        title: "AI Research Lead",
        committee: "AI Research",
        priorityScore: 90,
      },
    ],
    avatarGradient: "from-emerald-500 to-teal-700",
    highlightBadge: "Lead (Priority: 90)",
    highlightColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Leads AI & LLM research initiatives at Nexus Labs.",
  },
  {
    id: "user-2",
    name: "Bob Martinez",
    email: "bob@hawkinsight.com",
    systemRole: "USER",
    teamName: "Hawk Insight",
    roles: [
      {
        title: "Senior Designer",
        committee: "Design",
        priorityScore: 70,
      },
    ],
    avatarGradient: "from-blue-500 to-cyan-600",
    highlightBadge: "Senior (Priority: 70)",
    highlightColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Designs brand identity and workspace creative collaterals at Hawk Insight.",
  },
  {
    id: "user-4",
    name: "David Park",
    email: "david@freelancer.com",
    systemRole: "USER",
    teamName: "Nexus Labs",
    roles: [
      {
        title: "Guest Member",
        committee: null,
        priorityScore: 10,
      },
    ],
    avatarGradient: "from-amber-500 to-orange-600",
    highlightBadge: "Guest (Priority: 10)",
    highlightColor: "bg-orange-100 text-orange-800 border-orange-200",
    description: "External collaborator and freelancer with general workspace guest booking access.",
  },
]

interface PersonaSwitcherModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PersonaSwitcherModal({ isOpen, onClose }: PersonaSwitcherModalProps) {
  const { data: session } = useSession()
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [allPersonas, setAllPersonas] = useState<Persona[]>(ALL_PERSONAS)

  // Fetch dynamically registered database users
  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((dbUsers) => {
          if (Array.isArray(dbUsers) && dbUsers.length > 0) {
            const knownEmails = new Set(ALL_PERSONAS.map((p) => p.email.toLowerCase()))
            const dynamicPersonas: Persona[] = dbUsers
              .filter((u: any) => !knownEmails.has(u.email.toLowerCase()))
              .map((u: any) => {
                const teamRole = u.userTeamRoles?.[0]
                const roleTitle = teamRole?.customRoleTitle || "Member"
                const score = calculatePriorityScore(roleTitle)
                const isMgmt = u.systemRole === "OWNER" || u.systemRole === "WORKSPACE_MANAGER" || u.systemRole === "ADMIN"

                return {
                  id: u.id,
                  name: u.name || "Workspace Member",
                  email: u.email,
                  systemRole: u.systemRole,
                  teamName: teamRole?.team?.name || undefined,
                  roles: [
                    {
                      title: roleTitle,
                      committee: teamRole?.committeeName || null,
                      priorityScore: isMgmt ? undefined : score,
                    },
                  ],
                  avatarGradient: isMgmt ? "from-purple-600 to-indigo-700" : "from-emerald-600 to-teal-800",
                  highlightBadge: isMgmt ? u.systemRole : `${roleTitle} (${score})`,
                  highlightColor: isMgmt ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-emerald-100 text-emerald-800 border-emerald-200",
                  description: `Registered user (${u.email}) on ${teamRole?.team?.name || "Workspace"}.`,
                }
              })

            setAllPersonas([...ALL_PERSONAS, ...dynamicPersonas])
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  const handleSelectPersona = async (email: string) => {
    setSwitchingEmail(email)
    try {
      await signIn("credentials", {
        email,
        password: "demo-password",
        redirect: false,
      })
      onClose()
      window.location.reload()
    } catch (e) {
      console.error("Failed to switch persona:", e)
    } finally {
      setSwitchingEmail(null)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
              <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-foreground">
                        Persona & Identity Switcher
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        Switch between workspace roles or create a new user account on the fly.
                      </DialogDescription>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setCreateUserOpen(true)}
                    className="h-8 gap-1.5 text-xs font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 text-white shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create User</span>
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin">
                <div className="grid gap-3 sm:grid-cols-2">
                  {allPersonas.map((persona) => {
                    const isCurrent = session?.user?.email === persona.email
                    const isSwitching = switchingEmail === persona.email
                    const isManagement =
                      persona.systemRole === "OWNER" ||
                      persona.systemRole === "WORKSPACE_MANAGER" ||
                      persona.systemRole === "ADMIN"

                    return (
                      <motion.div
                        key={persona.email}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Card
                          onClick={() => !switchingEmail && !isCurrent && handleSelectPersona(persona.email)}
                          className={cn(
                            "cursor-pointer border transition-all duration-200 h-full flex flex-col justify-between overflow-hidden",
                            isCurrent
                              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                              : "border-border hover:border-primary/50 hover:shadow-md bg-card"
                          )}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Header of card */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${persona.avatarGradient} text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0`}
                                >
                                  {persona.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-foreground text-sm">{persona.name}</h4>
                                    {isCurrent && (
                                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">{persona.email}</p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] py-0 px-2 font-semibold border", persona.highlightColor)}
                              >
                                {persona.highlightBadge}
                              </Badge>
                            </div>

                            {/* Role breakdown */}
                            <div className="space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border/60 text-xs">
                              {isManagement ? (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground flex items-center gap-1.5">
                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                    {persona.roles[0]?.title}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                    Auto-Approved
                                  </Badge>
                                </div>
                              ) : (
                                persona.roles.map((role, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <span className="font-medium text-foreground">
                                      {role.title} {role.committee ? `(${role.committee})` : ""}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Description & Action */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {persona.description}
                            </p>

                            <div className="pt-1 flex items-center justify-between">
                              {persona.teamName ? (
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {persona.teamName}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3 text-purple-500" />
                                  Workspace Authority
                                </span>
                              )}

                              {isCurrent ? (
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                  Active Persona
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground flex items-center gap-1">
                                  {isSwitching ? "Switching..." : "Switch"}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSuccess={() => {
          setCreateUserOpen(false)
          onClose()
        }}
      />
    </>
  )
}
