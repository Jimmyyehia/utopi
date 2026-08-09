"use client"

import { useState } from "react"
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
import { PersonaSwitcherModal } from "@/components/auth/PersonaSwitcherModal"
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
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

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
            badge: session?.user?.systemRole === "OWNER" ? "Owner" : "Manager",
            badgeVariant: "manager" as const,
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
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black text-lg shadow-md flex-shrink-0">
                U
              </div>
              {isDesktopOpen && (
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
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDesktopToggle}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:flex"
            >
              <Menu className="h-4 w-4" />
            </Button>
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
                        variant={item.badgeVariant === "manager" ? "outline" : "outline"}
                        className={cn(
                          "ml-auto text-[10px] py-0 px-1.5 font-bold",
                          item.badgeVariant === "manager"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-primary/10 text-primary border-primary/30"
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

        {/* User Account / Persona Bottom Section */}
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
              <DropdownMenuContent align="end" side="top" className="w-56 p-1.5 shadow-xl">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Current Persona
                </DropdownMenuLabel>
                <div className="px-2 py-1.5 text-xs text-foreground bg-muted/40 rounded-md mb-1">
                  <p className="font-semibold">{session?.user?.name}</p>
                  <p className="text-muted-foreground text-[11px]">{session?.user?.systemRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {isManager && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Manager Approvals
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/teams" className="cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Teams Directory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPersonaModalOpen(true)}
                    className="cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Switch Persona
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              onClick={() => setPersonaModalOpen(true)}
              className={cn(
                "w-full justify-center gap-2 text-xs font-semibold bg-card hover:bg-muted",
                !isDesktopOpen && "p-2"
              )}
            >
              <LogIn className="h-4 w-4 text-primary flex-shrink-0" />
              <span className={cn(!isDesktopOpen && "hidden")}>Sign In / Persona</span>
            </Button>
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

              {/* Bottom Persona Area */}
              <div className="pt-3 border-t border-border space-y-2">
                <Button
                  onClick={() => {
                    setMobileDrawerOpen(false)
                    setPersonaModalOpen(true)
                  }}
                  className="w-full h-10 text-xs font-bold gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                  variant="outline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {status === "authenticated"
                      ? `Active: ${session?.user?.name?.split(" ")[0]}`
                      : "Switch Persona / Sign In"}
                  </span>
                </Button>
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

        {/* Persona Trigger */}
        <button
          onClick={() => setPersonaModalOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none"
        >
          <div className="p-1.5 rounded-xl text-primary bg-primary/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold text-primary mt-0.5">
            Persona
          </span>
        </button>
      </nav>

      {/* Persona Switcher Modal */}
      <PersonaSwitcherModal
        isOpen={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
      />
    </>
  )
}
