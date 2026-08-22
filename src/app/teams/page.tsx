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
  Lock,
  UserCheck,
} from "lucide-react"
import Link from "next/link"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn, getInitials, groupTeamMembers, GroupedTeamMember } from "@/lib/utils"

import { useSession } from "next-auth/react"
import { CreateUserModal } from "@/components/auth/CreateUserModal"
import { CreateTeamModal } from "@/components/teams/CreateTeamModal"

interface MemberInfo {
  userId: string
  userName: string
  userEmail: string
  committeeName?: string | null
  customRoleTitle: string
  priorityScore?: number
}

interface TeamDirectoryItem {
  id: string
  name: string
  description: string
  isPrivate: boolean
  isMember: boolean
  members: MemberInfo[]
}

export default function TeamsPage() {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"your-teams" | "all-teams">("your-teams")
  const [searchQuery, setSearchQuery] = useState("")

  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)

  const [allTeams, setAllTeams] = useState<TeamDirectoryItem[]>([])

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("utopi_teams_tab")
      if (savedTab === "your-teams" || savedTab === "all-teams") {
        setActiveTab(savedTab)
      }
      const params = new URLSearchParams(window.location.search)
      if (params.get("action") === "create") {
        setCreateTeamOpen(true)
      }
    }
  }, [])

  // Fetch approved teams from API dynamically with instant local cache fallback
  useEffect(() => {
    // 1. Instantly render from local cache if available
    try {
      const cached = sessionStorage.getItem("utopi_cached_teams")
      if (cached) {
        setAllTeams(JSON.parse(cached))
      }
    } catch (e) {}

    // 2. Fetch fresh data from API in background
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const dynamicTeams: TeamDirectoryItem[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || "Workspace tenant organization.",
            isPrivate: Boolean(t.isPrivate),
            isMember: Boolean(t.isMember),
            members: (t.members || []).map((m: any) => ({
              userId: m.userId || m.user?.id || "u-dyn",
              userName: m.user?.name || m.userName || "Member",
              userEmail: m.user?.email || m.userEmail || "member@utopi.space",
              committeeName: m.committeeName || null,
              customRoleTitle: m.customRoleTitle || "Member",
              priorityScore: 50,
            })),
          }))

          setAllTeams(dynamicTeams)
          try {
            sessionStorage.setItem("utopi_cached_teams", JSON.stringify(dynamicTeams))
          } catch (e) {}
        }
      })
      .catch(() => {})
  }, [session?.user?.email])

  // Filter teams by membership & privacy
  const { yourTeams, publicTeams } = useMemo(() => {
    const userEmail = session?.user?.email

    const yourList: TeamDirectoryItem[] = []
    const allList: TeamDirectoryItem[] = []

    allTeams.forEach((team) => {
      const belongsToTeam =
        team.isMember ||
        (userEmail ? team.members.some((m) => m.userEmail === userEmail) : false)

      if (belongsToTeam) {
        yourList.push({ ...team, isMember: true })
        allList.push({ ...team, isMember: true })
      } else if (!team.isPrivate || isManager) {
        // Public teams (or manager view) appear in All Teams
        allList.push({ ...team, isMember: isManager })
      }
    })

    yourList.sort((a, b) => a.name.localeCompare(b.name))
    allList.sort((a, b) => a.name.localeCompare(b.name))

    return { yourTeams: yourList, publicTeams: allList }
  }, [allTeams, session?.user?.email, isManager])

  const targetList = isManager ? publicTeams : (activeTab === "your-teams" ? yourTeams : publicTeams)

  const filteredTeams = targetList
    .map((team) => {
      const grouped = groupTeamMembers(team.members)
      const filteredGrouped = grouped.filter((m) => {
        const query = searchQuery.toLowerCase()
        const matchesName = m.userName.toLowerCase().includes(query)
        const matchesRole = m.roles.some(
          (r) =>
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
        team.groupedMembers.length > 0 ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

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
                Teams & Organizations
              </h1>
              <p className="text-[10px] text-muted-foreground sm:hidden font-medium">Tenant directory</p>
            </div>
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
          </div>
        </header>

        {/* Page Content */}
        <div suppressHydrationWarning className="p-3 sm:p-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
          {/* Tab Navigation: Visible ONLY for regular members. Higher Authority sees All Organizations Directory. */}
          <div suppressHydrationWarning className="flex items-center justify-between gap-4 border-b border-border/80 pb-3 flex-wrap">
            {!isManager ? (
              <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-2xl border border-border">
                <button
                  onClick={() => setActiveTab("your-teams")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2",
                    activeTab === "your-teams"
                      ? "bg-card text-primary shadow-sm border border-border/60 font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Your Teams</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                    {yourTeams.length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveTab("all-teams")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2",
                    activeTab === "all-teams"
                      ? "bg-card text-primary shadow-sm border border-border/60 font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>All Teams</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                    {publicTeams.length}
                  </Badge>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>All Workspace Organizations</span>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400 text-[10px] font-extrabold">
                  {publicTeams.length} Total
                </Badge>
              </div>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Teams Directory Grid */}
          <div className="space-y-6">
            {filteredTeams.map((team) => {
              const isMemberView = team.isMember || isManager

              return (
                <Card key={team.id} className="border-border rounded-3xl overflow-hidden shadow-xs bg-card">
                  <div className="p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2.5 tracking-tight">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span>{team.name}</span>
                        {team.isPrivate && (
                          <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400 font-bold flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Private Team
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                        {team.description}
                      </p>
                    </div>

                    {/* Total member count is visible to team members */}
                    {isMemberView ? (
                      <Badge variant="outline" className="text-xs py-1 px-3 bg-primary/10 text-primary border-primary/30 font-bold self-start sm:self-center">
                        {team.totalUniqueMembers} Member(s)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-1 px-2.5 bg-primary/5 text-primary/80 border-primary/20 font-medium self-start sm:self-center flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-primary/70" /> Internal Member Directory
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-6">
                    {isMemberView ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {team.groupedMembers.map((member) => (
                          <div
                            key={member.userId}
                            className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/50 transition-all flex items-start gap-3"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary font-black text-sm flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                              {getInitials(member.userName)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs font-extrabold text-foreground truncate">{member.userName}</p>
                              <div className="flex flex-wrap gap-1">
                                {member.roles.map((r, rIdx) => (
                                  <Badge
                                    key={rIdx}
                                    variant="outline"
                                    className="text-[10px] py-0.5 px-2 font-bold text-primary border-primary/30 bg-primary/10"
                                  >
                                    {r.combinedTitle}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 text-center space-y-1.5">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mb-0.5">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-extrabold text-foreground">
                          Internal Member Directory
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                          Detailed member profiles and directory information are visible to active members of {team.name}.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {filteredTeams.length === 0 && (
              <div className="text-center py-16 bg-card rounded-3xl border border-border">
                <p className="text-sm font-semibold text-foreground">
                  {activeTab === "your-teams" ? "You don't belong to any organizations yet" : "No teams found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === "your-teams"
                    ? "Click '+ Request Team' above to establish or join an organization!"
                    : "Try adjusting your search query"}
                </p>
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
