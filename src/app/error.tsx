"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application runtime error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-3xl border border-destructive/30 shadow-xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred while loading this workspace view. You can try refreshing the page or navigating back to the floor plan.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/60">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full h-9 text-xs font-semibold gap-1.5"
            size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="w-full h-9 text-xs font-semibold gap-1.5"
              size="sm"
            >
              <Home className="h-3.5 w-3.5" />
              Floor Plan
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
