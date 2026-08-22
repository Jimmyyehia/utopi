"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Building2,
  Briefcase,
  Shield,
  Search,
  ExternalLink,
  ChevronRight,
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
import { Input } from "@/components/ui/input"
import { getInitials, groupTeamMembers } from "@/lib/utils"

interface TeamDirectoryItem {
  id: string
  name: string
  description: string
  members: Array<{
    userId: string
    userName: string
    userEmail: string
    committeeName: string | null
    customRoleTitle: string
    priorityScore: number
  }>
}

interface TeamsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TeamsModal({ isOpen, onClose }: TeamsModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [dbTeams, setDbTeams] = useState<TeamDirectoryItem[]>([])

  useEffect(() => {
    if (isOpen) {
      fetch("/api/teams")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const mapped: TeamDirectoryItem[] = data.map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description || "Workspace tenant organization.",
              members: (t.members || []).map((m: any) => ({
                userId: m.userId || m.user?.id || "u-dyn",
                userName: m.user?.name || m.userName || "Member",
                userEmail: m.user?.email || m.userEmail || "member@utopi.space",
                committeeName: m.committeeName || null,
                customRoleTitle: m.customRoleTitle || "Member",
                priorityScore: 50,
              })),
            }))
            setDbTeams(mapped)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  const filteredTeams = dbTeams
    .map((team) => {
      const grouped = groupTeamMembers(team.members)
      const filteredGrouped = grouped.filter((m) => {
        const query = searchQuery.toLowerCase()
        const matchesName = m.userName.toLowerCase().includes(query)
        const matchesRole = m.roles.some(
          (r) =>
            r.combinedTitle.toLowerCase().includes(query) ||
            r.customRoleTitle.toLowerCase().includes(query) ||
            (r.committeeName && r.committeeName.toLowerCase().includes(query))
        )
        const matchesTeam = team.name.toLowerCase().includes(query)
        return matchesName || matchesRole || matchesTeam
      })

      return {
        ...team,
        groupedMembers: filteredGrouped,
        totalUniqueMembers: grouped.length,
      }
    })
    .filter(
      (team) =>
        team.groupedMembers.length > 0 || team.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    Workspace Teams & Committees
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Explore registered organizations, sub-committees, and member roles.
                  </DialogDescription>
                </div>
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by organization name, committee, or member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {filteredTeams.map((team) => (
                <div key={team.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {team.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
                        {team.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                      {team.totalUniqueMembers} Member(s)
                    </Badge>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {team.groupedMembers.map((member) => (
                      <Card key={member.userId} className="border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                        <CardContent className="p-3 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getInitials(member.userName)}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p className="text-xs font-bold text-foreground truncate">{member.userName}</p>
                              <div className="flex flex-wrap gap-1">
                                {member.roles.map((r, rIdx) => (
                                  <Badge
                                    key={rIdx}
                                    variant="outline"
                                    className="text-[10px] py-0.5 px-1.5 font-semibold text-primary border-primary/30 bg-primary/5"
                                  >
                                    {r.combinedTitle}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
