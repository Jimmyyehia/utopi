"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Handshake,
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  Users2,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Partner {
  id: string
  name: string
  fullName: string
  category: string
  icon: string
  colorTheme: {
    bg: string
    border: string
    text: string
    badgeBg: string
    gradient: string
  }
  tagline: string
  description: string
  keyInitiatives: string[]
  stats: { label: string; value: string }[]
  tags: string[]
  upcomingEvent?: {
    title: string
    room: string
    time: string
  }
}

const PARTNERS_DATA: Partner[] = [
  {
    id: "hackerrank-aufs",
    name: "HackerRank AUFS",
    fullName: "HackerRank Arab Urban Future Society (AUFS)",
    category: "Technical & Assessment Partner",
    icon: "💻",
    colorTheme: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    },
    tagline: "Empowering Next-Gen Software Engineers & Competitive Programmers",
    description:
      "The official HackerRank student chapter at AUFS hosts regular algorithmic challenges, software hackathons, technical interview preparation workshops, and code sprints inside Utopi's collaborative spaces.",
    keyInitiatives: [
      "Competitive Coding & Algorithms Sprints",
      "Technical Interview & System Design Workshops",
      "Hackathons & Collaborative Problem Solving",
      "Official HackerRank Certification Prep",
    ],
    stats: [
      { label: "Community Members", value: "350+" },
      { label: "Workshops Hosted", value: "24" },
      { label: "Annual Hackathons", value: "4" },
    ],
    tags: ["Algorithms", "Hackathons", "Tech Community", "Interviews"],
    upcomingEvent: {
      title: "Bi-Weekly Algorithm Sprint & Code Review",
      room: "Focus Room",
      time: "Thursday • 4:00 PM – 6:00 PM",
    },
  },
  {
    id: "hawkinsight",
    name: "HawkInsight",
    fullName: "HawkInsight PR & Communications Agency",
    category: "Strategic Communications Partner",
    icon: "🦅",
    colorTheme: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-600 dark:text-indigo-400",
      badgeBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      gradient: "from-indigo-500/15 via-indigo-500/5 to-transparent",
    },
    tagline: "High-Impact PR, Media Strategy & Brand Positioning",
    description:
      "A strategic communications powerhouse dedicated to narrative craftsmanship, press outreach, brand reputation management, and public relations consulting for emerging startups and student organizations.",
    keyInitiatives: [
      "Press Release Formulation & Media Distribution",
      "Brand Narrative & Strategic Positioning",
      "Crisis Communications Advisory",
      "Public Relations All-Hands & Strategy Reviews",
    ],
    stats: [
      { label: "Campaigns Launched", value: "40+" },
      { label: "Media Reach", value: "500K+" },
      { label: "Client Satisfaction", value: "98%" },
    ],
    tags: ["Public Relations", "Media Strategy", "Brand Building", "Communications"],
    upcomingEvent: {
      title: "Quarterly Press Strategy & Narrative Review",
      room: "Meeting Room",
      time: "Today • 2:00 PM – 4:00 PM",
    },
  },
  {
    id: "phd",
    name: "PHD",
    fullName: "PHD (Pacemakers' Hardest Decision)",
    category: "Leadership & Strategy Consortium",
    icon: "⚡",
    colorTheme: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-600 dark:text-purple-400",
      badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
    },
    tagline: "High-Stakes Business Strategy & Leadership Case Competition",
    description:
      "PHD (Pacemakers' Hardest Decision) challenges emerging leaders to navigate intense executive dilemmas, strategic corporate simulations, and competitive case analyses under pressure.",
    keyInitiatives: [
      "Executive Case Studies & Strategic Dilemmas",
      "High-Pressure Leadership Simulations",
      "Annual Inter-University Case Competition",
      "Mentorship with Seasoned Industry Executives",
    ],
    stats: [
      { label: "Case Competitors", value: "200+" },
      { label: "Corporate Case Studies", value: "18" },
      { label: "Executive Mentors", value: "12" },
    ],
    tags: ["Leadership", "Business Strategy", "Case Competition", "Decision-Making"],
    upcomingEvent: {
      title: "Executive Case Study Strategy Session",
      room: "Main Hall",
      time: "Saturday • 10:00 AM – 1:00 PM",
    },
  },
]

export default function PartnersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
              <Handshake className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                Our Partners
              </h1>
              <p className="text-[10px] text-muted-foreground sm:hidden font-medium">3 Collaborations</p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-semibold py-0.5 border-primary/30 text-primary">
              3 Strategic Partners
            </Badge>
          </div>

        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-8">
          {/* Hero Banner */}
          <div className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-purple-500/10 border border-border/80 shadow-sm overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-bold">
                Ecosystem & Collaborations
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Our Strategic Workspace Partners
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Utopi collaborates with premier tech societies, strategic PR agencies, and business leadership platforms to power exceptional hackathons, workshops, and high-impact sessions.
              </p>
            </div>
          </div>

          {/* Partners Showcase Grid */}
          <div className="grid grid-cols-1 gap-6">
            {PARTNERS_DATA.map((partner) => (
              <Card
                key={partner.id}
                className={cn(
                  "border rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md",
                  partner.colorTheme.border
                )}
              >
                <div
                  className={cn(
                    "p-6 sm:p-8 bg-gradient-to-r relative",
                    partner.colorTheme.gradient
                  )}
                >
                  {/* Partner Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl p-3 rounded-2xl bg-card border border-border/80 shadow-xs flex-shrink-0">
                        {partner.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            {partner.name}
                          </h3>
                          <Badge variant="outline" className={cn("text-xs font-bold", partner.colorTheme.badgeBg)}>
                            {partner.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {partner.fullName}
                        </p>
                        <p className="text-sm font-semibold text-foreground/90 mt-2">
                          &ldquo;{partner.tagline}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-5 bg-border/60" />

                  {/* Description & Key Activities */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          About the Partnership
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {partner.description}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {partner.stats.map((stat, idx) => (
                          <div key={idx} className="bg-card/70 backdrop-blur-xs p-3 rounded-2xl border border-border/60 text-center">
                            <p className={cn("text-base sm:text-lg font-black", partner.colorTheme.text)}>
                              {stat.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-5 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-primary" />
                          Key Programs & Sprints
                        </h4>
                        <div className="space-y-1.5">
                          {partner.keyInitiatives.map((init, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/50 text-xs font-medium text-foreground"
                            >
                              <CheckCircle2 className={cn("h-3.5 w-3.5 flex-shrink-0", partner.colorTheme.text)} />
                              <span>{init}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upcoming Event */}
                      {partner.upcomingEvent && (
                        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                              Featured Session
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                              {partner.upcomingEvent.room}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {partner.upcomingEvent.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {partner.upcomingEvent.time}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {partner.tags.map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] py-0.5 px-2.5 font-medium rounded-lg text-muted-foreground bg-card border-border/60"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>

                    <Link href="/">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-xl h-8">
                        <Calendar className="h-3.5 w-3.5" />
                        Book Space for {partner.name}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
