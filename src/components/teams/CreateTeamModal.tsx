"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2,
  Sparkles,
  X,
  CheckCircle2,
  FileText,
  Briefcase,
  Users,
  Clock,
  UserCheck,
  Lock,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  const { data: session } = useSession()
  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [committeeName, setCommitteeName] = useState("")
  const [customRoleTitle, setCustomRoleTitle] = useState("President")
  const [otherRoles, setOtherRoles] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim()) {
      setErrorMessage("Organization name is required.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          committeeName: committeeName.trim() || undefined,
          customRoleTitle: customRoleTitle.trim() || "Founder / Lead",
          otherRoles: otherRoles.trim() || undefined,
          isPrivate,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit organization request.")
      }

      if (isManager) {
        setSuccessMessage(`Organization "${name}" created and approved!`)
      } else {
        setSuccessMessage(
          `Organization request for "${name}" submitted! A manager will review it and you will receive an email confirmation upon approval.`
        )
      }

      setTimeout(() => {
        onSuccess?.()
        onClose()
        setName("")
        setDescription("")
        setOtherRoles("")
        setIsPrivate(false)
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create organization.")
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
          <div className="p-6 border-b border-border bg-gradient-to-br from-purple-500/10 via-card to-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  {isManager ? "Create Organization" : "Request Organization"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isManager
                    ? "Add an active tenant team to Utopi"
                    : "Submit a new team for workspace manager approval"}
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* Requester Identity Pill */}
            {session?.user && (
              <div className="p-2.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{session.user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30 flex-shrink-0">
                  {isManager ? "Workspace Authority" : "Requesting User"}
                </Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="team-name" className="text-xs font-semibold text-muted-foreground">
                Organization / Team Name *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="team-name"
                  placeholder="e.g. Pacemakers, AI Society, Apex Dynamics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-8 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team-desc" className="text-xs font-semibold text-muted-foreground">
                Description / Mission
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                <textarea
                  id="team-desc"
                  placeholder="Briefly describe the team's purpose and activities within Utopi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-8 p-2.5 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none min-h-[60px]"
                />
              </div>
            </div>

            {/* Show committee and role options ONLY for regular users requesting to join/found a team */}
            {!isManager && (
              <>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Your Committee</Label>
                    <Input
                      placeholder="e.g. Executive Board"
                      value={committeeName}
                      onChange={(e) => setCommitteeName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Your Requested Role</Label>
                    <select
                      value={customRoleTitle}
                      onChange={(e) => setCustomRoleTitle(e.target.value)}
                      className="w-full h-9 text-xs rounded-xl border border-input bg-background px-3 py-1 font-medium shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                    >
                      <option value="Founder">Founder</option>
                      <option value="Head">Head</option>
                      <option value="President">President</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Vice Head">Vice Head</option>
                      <option value="Vice President">Vice President</option>
                      <option value="Vice Project Manager">Vice Project Manager</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Other Roles in This Organization
                  </Label>
                  <Input
                    placeholder="e.g. Co-Founder, Tech Lead, PR Director, Designer"
                    value={otherRoles}
                    onChange={(e) => setOtherRoles(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Optional: List other member titles that will be part of this team.
                  </p>
                </div>
              </>
            )}

            {/* Private Organization Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="private-toggle" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-purple-600" />
                  Private Organization
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Hide from public directory. Visible only to team members and workspace management.
                </p>
              </div>
              <input
                id="private-toggle"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-purple-400 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0"
              />
            </div>

            {!isManager && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  Manager Review Workflow
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Workspace management will review your requested role and team details on the approvals dashboard. You will receive an automated email confirmation once approved.
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-bold gap-2 shadow-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{isManager ? "Create Organization" : "Submit Organization Request"}</span>
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
