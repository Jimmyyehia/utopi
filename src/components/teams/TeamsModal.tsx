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
import { getInitials } from "@/lib/utils"

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

const STATIC_TEAMS: TeamDirectoryItem[] = [
  {
    id: "hawk-insight",
    name: "Hawk Insight",
    description: "Strategic communications, branding, and public relations agency managing enterprise workspace campaigns.",
    members: [
      {
        userId: "user-1",
        userName: "Alice Chen",
        userEmail: "alice@hawkinsight.com",
        committeeName: "PR",
        customRoleTitle: "PR Head",
        priorityScore: 100,
      },
      {
        userId: "user-1",
        userName: "Alice Chen",
        userEmail: "alice@hawkinsight.com",
        committeeName: "Engineering",
        customRoleTitle: "Technical Lead",
        priorityScore: 90,
      },
      {
        userId: "user-2",
        userName: "Bob Martinez",
        userEmail: "bob@hawkinsight.com",
        committeeName: "Design",
        customRoleTitle: "Senior Designer",
        priorityScore: 70,
      },
    ],
  },
  {
    id: "nexus-labs",
    name: "Nexus Labs",
    description: "Applied artificial intelligence, LLM fine-tuning, and next-generation workspace tools incubator.",
    members: [
      {
        userId: "user-3",
        userName: "Carol Kim",
        userEmail: "carol@nexuslabs.com",
        committeeName: "AI Research",
        customRoleTitle: "AI Research Lead",
        priorityScore: 90,
      },
      {
        userId: "user-4",
        userName: "David Park",
        userEmail: "david@freelancer.com",
        committeeName: null,
        customRoleTitle: "Guest Member",
        priorityScore: 10,
      },
    ],
  },
]

interface TeamsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TeamsModal({ isOpen, onClose }: TeamsModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTeams = STATIC_TEAMS.map((team) => ({
    ...team,
    members: team.members.filter(
      (m) =>
        m.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.customRoleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.committeeName && m.committeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((team) => team.members.length > 0 || team.name.toLowerCase().includes(searchQuery.toLowerCase()))

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

              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by team, member name, or custom role..."
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
                      {team.members.length} Role(s)
                    </Badge>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {team.members.map((member, idx) => (
                      <Card key={idx} className="border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {getInitials(member.userName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{member.userName}</p>
                              <p className="text-[11px] text-primary font-medium truncate">{member.customRoleTitle}</p>
                              {member.committeeName && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Committee: {member.committeeName}
                                </p>
                              )}
                            </div>
                          </div>

                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono flex-shrink-0">
                            Score: {member.priorityScore}
                          </Badge>
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
