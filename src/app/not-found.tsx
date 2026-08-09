"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Compass, Home, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-3xl border border-border shadow-xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
          <Compass className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-foreground">404</h1>
          <h2 className="text-lg font-bold text-foreground">Space or Page Not Found</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The workspace room or page you are trying to reach doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/">
            <Button className="w-full h-9 text-xs font-semibold gap-1.5" size="sm">
              <Home className="h-3.5 w-3.5" />
              Floor Plan
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="outline" className="w-full h-9 text-xs font-semibold gap-1.5" size="sm">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
