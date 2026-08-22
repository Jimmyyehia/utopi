"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Layers,
  LayoutDashboard,
  Users,
  Calendar,
  Handshake,
  Menu,
  PanelLeftClose,
  PanelLeft,
  X,
  Sparkles,
  LogOut,
  UserCheck,
  Building2,
  LogIn,
  ChevronDown,
  UserPlus,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { CreateUserModal } from "@/components/auth/CreateUserModal"
import { CreateTeamModal } from "@/components/teams/CreateTeamModal"
import { cn, getInitials } from "@/lib/utils"

interface AppSidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export function AppSidebar({ isOpen: controlledIsOpen, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [internalOpen, setInternalOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false)

  const isDesktopOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen
  const handleDesktopToggle = onToggle || (() => setInternalOpen(!internalOpen))

  const isManager =
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN" ||
    session?.user?.systemRole === "OWNER"

  const navItems = [
    {
      label: "Floor Plan",
      href: "/",
      icon: Layers,
      isActive: pathname === "/",
    },
    ...(isManager
      ? [
          {
            label: "Approvals",
            href: "/dashboard",
            icon: LayoutDashboard,
            isActive: pathname === "/dashboard",
          },
        ]
      : []),
    {
      label: "Teams & Roles",
      href: "/teams",
      icon: Users,
      isActive: pathname.startsWith("/teams"),
    },
    {
      label: "Our Partners",
      href: "/partners",
      icon: Handshake,
      isActive: pathname.startsWith("/partners"),
      badge: "3",
      badgeVariant: "primary" as const,
    },
    {
      label: "Schedule",
      href: "/schedule",
      icon: Calendar,
      isActive: pathname.startsWith("/schedule"),
    },
    ...(session?.user
      ? [
          {
            label: "My Profile",
            href: "/profile",
            icon: UserCheck,
            isActive: pathname.startsWith("/profile"),
          },
        ]
      : []),
  ]

  return (
    <>
      {/* =========================================================================
          1. DESKTOP & TABLET SIDEBAR (Hidden on small mobile < 768px)
          ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 flex-col justify-between shadow-sm",
          isDesktopOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Logo */}
          <div className={cn("h-16 flex items-center border-b border-border px-3.5", isDesktopOpen ? "justify-between" : "justify-center")}>
            {isDesktopOpen ? (
              <>
                <Link href="/" className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black text-lg shadow-md flex-shrink-0">
                    U
                  </div>
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="font-extrabold text-lg text-foreground tracking-tight leading-none">
                      Utopi
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-0.5">
                      Workspace
                    </span>
                  </motion.div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDesktopToggle}
                  title="Collapse Sidebar"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:flex"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <button
                onClick={handleDesktopToggle}
                title="Expand Sidebar"
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black text-lg shadow-md hover:scale-105 transition-transform cursor-pointer"
              >
                U
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="block">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 font-medium transition-all",
                      item.isActive
                        ? "bg-primary/10 text-primary font-bold shadow-xs hover:bg-primary/15"
                        : "text-foreground hover:bg-muted text-muted-foreground hover:text-foreground",
                      !isDesktopOpen && "justify-center px-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        item.isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className={cn(!isDesktopOpen && "hidden")}>{item.label}</span>
                    {item.badge && isDesktopOpen && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto text-[10px] py-0 px-1.5 font-bold",
                          item.badgeVariant === "primary"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Account / Persona Bottom Section (Permanent Production Profile & Identity Management) */}
        <div className={cn("p-3 border-t border-border bg-muted/20", !isDesktopOpen && "px-2")}>
          {status === "authenticated" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-12 p-2 hover:bg-muted rounded-xl",
                    !isDesktopOpen && "justify-center px-2"
                  )}
                >
                  <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                      {getInitials(session?.user?.name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex-1 text-left min-w-0", !isDesktopOpen && "hidden")}>
                    <p className="text-xs font-bold text-foreground truncate">{session?.user?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground flex-shrink-0",
                      !isDesktopOpen && "hidden"
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-64 p-1.5 shadow-xl">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  My Profile & Identity
                </DropdownMenuLabel>
                <div className="px-2.5 py-2 text-xs text-foreground bg-muted/40 rounded-xl mb-1.5 space-y-0.5">
                  <p className="font-bold text-sm">{session?.user?.name}</p>
                  <p className="text-muted-foreground text-[11px] truncate">{session?.user?.email}</p>
                  <Badge variant="outline" className="text-[10px] mt-1 font-mono">
                    {session?.user?.systemRole}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {isManager ? (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer font-medium text-xs py-2">
                        <Building2 className="h-4 w-4 mr-2 text-purple-600" />
                        <span>Approve Organization Requests</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/teams" className="cursor-pointer font-medium text-xs py-2">
                        <Building2 className="h-4 w-4 mr-2 text-purple-600" />
                        <span>Request Organization</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:bg-destructive/10 cursor-pointer text-xs py-2 font-semibold"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/signin" className="w-full">
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-center gap-2 text-xs font-semibold bg-card hover:bg-muted shadow-xs",
                  !isDesktopOpen && "p-2"
                )}
              >
                <LogIn className="h-4 w-4 text-primary flex-shrink-0" />
                <span className={cn(!isDesktopOpen && "hidden")}>Sign In / Join</span>
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE OFF-CANVAS SLIDE-OVER DRAWER (Visible when opened on phone)
          ========================================================================= */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Slide-in Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-4/5 max-w-xs h-full bg-card border-r border-border shadow-2xl flex flex-col justify-between p-4"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black text-base shadow-sm">
                      U
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-foreground leading-none">Utopi</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">Workspace</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="h-8 w-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Nav items */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="block"
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 h-10 text-xs font-semibold rounded-xl",
                            item.isActive
                              ? "bg-primary/10 text-primary font-bold shadow-xs"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", item.isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.label}</span>
                          {item.badge && (
                            <Badge variant="outline" className="ml-auto text-[9px] py-0 px-1.5 font-bold">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Profile Area for Mobile Drawer */}
              <div className="pt-3 border-t border-border space-y-2">
                {status === "authenticated" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border">
                      <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/30">
                        <AvatarImage src={session?.user?.image || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                          {session?.user?.name ? getInitials(session.user.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{session?.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full h-9 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20"
                      variant="outline"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/auth/signin" className="w-full">
                      <Button variant="outline" className="w-full h-9 text-xs font-semibold">
                        <LogIn className="h-3.5 w-3.5 mr-1.5" />
                        <span>Sign In</span>
                      </Button>
                    </Link>
                    <Button
                      onClick={() => {
                        setMobileDrawerOpen(false)
                        setCreateUserModalOpen(true)
                      }}
                      className="w-full h-9 text-xs font-bold bg-primary text-primary-foreground"
                    >
                      <span>Create User</span>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          3. FIXED MOBILE BOTTOM NAVIGATION BAR (Screens < md:)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-card/95 backdrop-blur-xl border-t border-border z-40 px-2 flex items-center justify-around shadow-lg">
        {/* Floor Plan */}
        <Link href="/" className="flex flex-col items-center justify-center flex-1 py-1">
          <div
            className={cn(
              "p-1.5 rounded-xl transition-all",
              pathname === "/" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-5 w-5" />
          </div>
          <span className={cn("text-[10px] font-semibold mt-0.5", pathname === "/" ? "text-primary font-bold" : "text-muted-foreground")}>
            Floor Plan
          </span>
        </Link>

        {/* Schedule */}
        <Link href="/schedule" className="flex flex-col items-center justify-center flex-1 py-1">
          <div
            className={cn(
              "p-1.5 rounded-xl transition-all",
              pathname.startsWith("/schedule") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
          </div>
          <span className={cn("text-[10px] font-semibold mt-0.5", pathname.startsWith("/schedule") ? "text-primary font-bold" : "text-muted-foreground")}>
            Schedule
          </span>
        </Link>

        {/* Approvals (for Managers) OR Partners */}
        {isManager ? (
          <Link href="/dashboard" className="flex flex-col items-center justify-center flex-1 py-1">
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all relative",
                pathname.startsWith("/dashboard") ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className={cn("text-[10px] font-semibold mt-0.5", pathname.startsWith("/dashboard") ? "text-purple-600 font-bold" : "text-muted-foreground")}>
              Approvals
            </span>
          </Link>
        ) : (
          <Link href="/partners" className="flex flex-col items-center justify-center flex-1 py-1">
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all",
                pathname.startsWith("/partners") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Handshake className="h-5 w-5" />
            </div>
            <span className={cn("text-[10px] font-semibold mt-0.5", pathname.startsWith("/partners") ? "text-primary font-bold" : "text-muted-foreground")}>
              Partners
            </span>
          </Link>
        )}

        {/* Teams Directory */}
        <Link href="/teams" className="flex flex-col items-center justify-center flex-1 py-1">
          <div
            className={cn(
              "p-1.5 rounded-xl transition-all",
              pathname.startsWith("/teams") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-5 w-5" />
          </div>
          <span className={cn("text-[10px] font-semibold mt-0.5", pathname.startsWith("/teams") ? "text-primary font-bold" : "text-muted-foreground")}>
            Teams
          </span>
        </Link>

        {/* Account / Auth Trigger for Mobile */}
        {session?.user ? (
          <button
            onClick={() => setCreateUserModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none"
          >
            <div className="p-1 rounded-lg text-primary bg-primary/10">
              <Avatar className="h-5 w-5 rounded-md">
                <AvatarImage src={session.user.image || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[9px]">
                  {session.user.name ? getInitials(session.user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[10px] font-semibold text-primary mt-0.5 truncate max-w-[50px]">
              Profile
            </span>
          </button>
        ) : (
          <Link
            href="/auth/signin"
            className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none"
          >
            <div className="p-1.5 rounded-xl text-primary bg-primary/10">
              <LogIn className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-primary mt-0.5">
              Sign In
            </span>
          </Link>
        )}
      </nav>

      {/* User Registration Modal */}
      <CreateUserModal
        isOpen={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        onRequestNewTeam={() => setCreateTeamModalOpen(true)}
        onSuccess={() => {
          setCreateUserModalOpen(false)
          window.location.reload()
        }}
      />

      {/* Separate Organization Creation / Request Modal */}
      <CreateTeamModal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        onSuccess={() => {
          setCreateTeamModalOpen(false)
          window.location.reload()
        }}
      />
    </>
  )
}
