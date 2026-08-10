"use client"

import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Users,
  Building2,
  Search,
  Shield,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  Star,
} from "lucide-react"
import Link from "next/link"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn, getInitials } from "@/lib/utils"

import { useSession } from "next-auth/react"
import { CreateUserModal } from "@/components/auth/CreateUserModal"
import { CreateTeamModal } from "@/components/teams/CreateTeamModal"

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
    description:
      "Strategic communications, branding, and public relations agency managing enterprise workspace campaigns.",
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
    id: "hackerrank-aufs",
    name: "HackerRank AUFS",
    description:
      "Technical chapter at Arab Urban Future Society hosting competitive algorithmic challenges, code sprints, and system design workshops.",
    members: [
      {
        userId: "user-hr-1",
        userName: "Tarek Mansour",
        userEmail: "tarek@hackerrank-aufs.org",
        committeeName: "Competitive Coding",
        customRoleTitle: "Chapter President",
        priorityScore: 100,
      },
      {
        userId: "user-hr-2",
        userName: "Laila Nader",
        userEmail: "laila@hackerrank-aufs.org",
        committeeName: "Technical Content",
        customRoleTitle: "Lead Problem Setter",
        priorityScore: 90,
      },
    ],
  },
  {
    id: "phd",
    name: "PHD",
    description:
      "Pacemakers' Hardest Decision (PHD) — Executive leadership, business case competitions, and strategic corporate simulations.",
    members: [
      {
        userId: "user-phd-1",
        userName: "Karim Zaki",
        userEmail: "karim@phd-case.org",
        committeeName: "Strategy & Cases",
        customRoleTitle: "Executive Director",
        priorityScore: 100,
      },
      {
        userId: "user-phd-2",
        userName: "Nouran Selim",
        userEmail: "nouran@phd-case.org",
        committeeName: "Corporate Relations",
        customRoleTitle: "Senior Director",
        priorityScore: 80,
      },
    ],
  },
  {
    id: "nexus-labs",
    name: "Nexus Labs",
    description:
      "Applied artificial intelligence, LLM fine-tuning, and next-generation workspace tools incubator.",
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

export default function TeamsPage() {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [allTeams, setAllTeams] = useState<TeamDirectoryItem[]>(STATIC_TEAMS)

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  // Fetch approved teams from database dynamically
  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const dynamicTeams: TeamDirectoryItem[] = data
            .filter((t: any) => (t.status === "APPROVED" || !t.status) && !STATIC_TEAMS.some(st => st.id === t.id))
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description || "Workspace tenant organization.",
              members: (t.roles || []).map((r: any) => ({
                userId: r.userId || r.user?.id || "user-dyn",
                userName: r.user?.name || "Member",
                userEmail: r.user?.email || "member@utopi.space",
                committeeName: r.committeeName || null,
                customRoleTitle: r.customRoleTitle || "Member",
                priorityScore: 50,
              })),
            }))

          setAllTeams([...STATIC_TEAMS, ...dynamicTeams])
        }
      })
      .catch(() => {})
  }, [])

  // Team Privacy: Regular users can ONLY see their own organization!
  // Managers and Owners can view all organizations.
  const visibleTeams = useMemo(() => {
    if (isManager) return allTeams
    if (!session?.user?.email) return []

    return allTeams.filter((team) =>
      team.members.some((m) => m.userEmail === session?.user?.email)
    )
  }, [isManager, session?.user?.email, allTeams])

  const filteredTeams = visibleTeams
    .map((team) => ({
      ...team,
      members: team.members.filter(
        (m) =>
          m.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.customRoleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.committeeName && m.committeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          team.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (team) => team.members.length > 0 || team.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const totalRoles = filteredTeams.reduce((acc, t) => acc + t.members.length, 0)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Universal Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Page Area */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-h-screen pb-20 md:pb-0",
          sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-20"
        )}
      >
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                Teams & Roles
              </h1>
              <p className="text-[10px] text-muted-foreground sm:hidden font-medium">{totalRoles} Active Roles</p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-semibold py-0.5 border-primary/30 text-primary">
              {filteredTeams.length} Organizations • {totalRoles} Roles
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {session?.user && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateTeamOpen(true)}
                className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-xs font-semibold rounded-xl border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{isManager ? "+ Add Team" : "+ Request Team"}</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setCreateUserOpen(true)}
              className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>+ Add User</span>
            </Button>

            <Link href="/">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-xs rounded-xl">
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Floor Plan</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by team, member, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Active Organization Members</span>
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>

          {/* Teams Directory Grid */}
          <div className="space-y-6">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="border-border rounded-3xl overflow-hidden shadow-xs bg-card">
                <div className="p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2.5 tracking-tight">
                      <Building2 className="h-5 w-5 text-primary" />
                      {team.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {team.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs py-1 px-3 bg-primary/10 text-primary border-primary/30 font-bold self-start sm:self-center">
                    {team.members.length} Member(s)
                  </Badge>
                </div>

                <CardContent className="p-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {team.members.map((member, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/50 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary font-black text-sm flex items-center justify-center flex-shrink-0 shadow-2xs">
                            {getInitials(member.userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{member.userName}</p>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-primary border-primary/30 bg-primary/5 mt-0.5">
                              {member.customRoleTitle}
                            </Badge>
                            {member.committeeName ? (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Committee: {member.committeeName}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/75 truncate mt-0.5">General Member</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTeams.length === 0 && (
              <div className="text-center py-16 bg-card rounded-3xl border border-border">
                <p className="text-sm font-semibold text-foreground">No teams or members found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onRequestNewTeam={() => setCreateTeamOpen(true)}
        onSuccess={() => {
          setCreateUserOpen(false)
          window.location.reload()
        }}
      />

      <CreateTeamModal
        isOpen={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onSuccess={() => {
          setCreateTeamOpen(false)
          window.location.reload()
        }}
      />
    </div>
  )
}
