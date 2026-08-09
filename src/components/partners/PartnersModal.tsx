"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Handshake,
  ExternalLink,
  Sparkles,
  Code2,
  Megaphone,
  Zap,
  CheckCircle2,
  Award,
  Users2,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PartnersModalProps {
  isOpen: boolean
  onClose: () => void
}

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
    badgeText: string
    gradient: string
  }
  tagline: string
  description: string
  highlights: string[]
  tags: string[]
}

const PARTNERS: Partner[] = [
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
      badgeText: "text-emerald-700 dark:text-emerald-300",
      gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    },
    tagline: "Empowering Next-Gen Software Engineers & Competitive Programmers",
    description:
      "The official HackerRank chapter at AUFS hosts regular algorithmic challenges, software hackathons, technical interview preparation workshops, and code sprints inside Utopi's collaborative rooms.",
    highlights: [
      "Competitive Coding & Algorithms Sprints",
      "Technical Interview & System Design Workshops",
      "Hackathons & Collaborative Problem Solving",
      "Official HackerRank Certification Prep",
    ],
    tags: ["Algorithms", "Hackathons", "Tech Community", "Interviews"],
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
      badgeText: "text-indigo-700 dark:text-indigo-300",
      gradient: "from-indigo-500/20 via-indigo-500/5 to-transparent",
    },
    tagline: "High-Impact PR, Media Strategy & Brand Positioning",
    description:
      "A strategic communications powerhouse dedicated to narrative craftsmanship, press outreach, brand reputation management, and public relations consulting for emerging startups and student organizations.",
    highlights: [
      "Press Release Formulation & Media Distribution",
      "Brand Narrative & Strategic Positioning",
      "Crisis Communications Advisory",
      "Public Relations All-Hands & Strategy Reviews",
    ],
    tags: ["Public Relations", "Media Strategy", "Brand Building", "Communications"],
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
      badgeText: "text-purple-700 dark:text-purple-300",
      gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    },
    tagline: "High-Stakes Business Strategy & Leadership Case Competition",
    description:
      "PHD (Pacemakers' Hardest Decision) challenges leaders to navigate intense executive dilemmas, strategic corporate simulations, and competitive case analyses under pressure.",
    highlights: [
      "Executive Case Studies & Strategic Dilemmas",
      "High-Pressure Leadership Simulations",
      "Annual Inter-University Case Competition",
      "Mentorship with Seasoned Industry Executives",
    ],
    tags: ["Leadership", "Business Strategy", "Case Competition", "Decision-Making"],
  },
]

export function PartnersModal({ isOpen, onClose }: PartnersModalProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(PARTNERS[0].id)
  const activePartner = PARTNERS.find((p) => p.id === selectedPartnerId) || PARTNERS[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Our Strategic Partners
                <Badge variant="outline" className="text-xs py-0 px-2 border-primary/30 text-primary font-semibold">
                  3 Partners
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Organizations, student chapters, and agencies powering innovation inside Utopi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body: Left selector tabs + Right detail view */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] max-h-[70vh]">
          {/* Left Partner Selection Column */}
          <div className="md:col-span-4 p-4 border-r border-border bg-muted/10 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 mb-2">
              Select Partner
            </p>
            {PARTNERS.map((partner) => {
              const isSelected = partner.id === selectedPartnerId
              return (
                <button
                  key={partner.id}
                  onClick={() => setSelectedPartnerId(partner.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3",
                    isSelected
                      ? "bg-card border-primary/40 shadow-md ring-1 ring-primary/20 font-semibold"
                      : "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border",
                      partner.colorTheme.bg,
                      partner.colorTheme.border
                    )}
                  >
                    {partner.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-bold truncate", isSelected ? "text-foreground" : "text-foreground/80")}>
                      {partner.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{partner.category}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Partner Details Column */}
          <ScrollArea className="md:col-span-8 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePartner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Hero Card */}
                <div className={cn("p-5 rounded-2xl border relative overflow-hidden bg-gradient-to-br", activePartner.colorTheme.gradient, activePartner.colorTheme.border)}>
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 bg-card/80 backdrop-blur-md rounded-2xl border border-border/80 shadow-xs">
                        {activePartner.icon}
                      </span>
                      <div>
                        <h3 className="font-black text-lg text-foreground tracking-tight">
                          {activePartner.name}
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {activePartner.fullName}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] py-0.5 px-2 font-bold", activePartner.colorTheme.badgeBg)}>
                      {activePartner.category}
                    </Badge>
                  </div>

                  <p className="text-xs font-semibold text-foreground/90 mt-3 pt-3 border-t border-border/40 leading-relaxed">
                    &ldquo;{activePartner.tagline}&rdquo;
                  </p>
                </div>

                {/* About Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    About the Partnership
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-2xl border border-border/60">
                    {activePartner.description}
                  </p>
                </div>

                {/* Key Initiatives / Highlights */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    Key Activities & Programs
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activePartner.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-xl border border-border/50 bg-card text-xs font-medium text-foreground"
                      >
                        <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0 mt-0.5", activePartner.colorTheme.text)} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activePartner.tags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] py-0.5 px-2.5 font-medium rounded-lg text-muted-foreground border-border/70"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Partnering with Utopi for collaborative workspaces & events.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8 rounded-xl">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
