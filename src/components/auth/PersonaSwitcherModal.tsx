"use client"

import { useState } from "react"
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
  X,
  Crown,
  Layers,
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
import { cn } from "@/lib/utils"

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
                      Switch between workspace roles with different committees and priority scores.
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin">
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_PERSONAS.map((persona) => {
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
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span className="font-medium flex items-center gap-1 text-primary">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Authority:
                                </span>
                                <span className="font-bold text-foreground">Workspace Management (Direct)</span>
                              </div>
                            ) : (
                              <>
                                {persona.teamName && (
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="font-medium flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-primary" />
                                      Team:
                                    </span>
                                    <span className="font-semibold text-foreground">{persona.teamName}</span>
                                  </div>
                                )}
                                {persona.roles.map((r, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-muted-foreground pt-0.5">
                                    <span className="truncate pr-2">
                                      • {r.title} {r.committee ? `(${r.committee})` : ""}
                                    </span>
                                    {r.priorityScore !== undefined && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                        Score: {r.priorityScore}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-snug">
                            {persona.description}
                          </p>

                          {/* Action CTA */}
                          <div className="pt-1">
                            {isCurrent ? (
                              <div className="w-full py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Active Identity
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                disabled={Boolean(switchingEmail)}
                                className="w-full text-xs font-semibold h-8 bg-card hover:bg-primary hover:text-primary-foreground border border-border transition-all gap-1.5 justify-center"
                              >
                                {isSwitching ? (
                                  <>
                                    <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                    <span>Switching...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Switch to {persona.name.split(" ")[0]}</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </>
                                )}
                              </Button>
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
  )
}
