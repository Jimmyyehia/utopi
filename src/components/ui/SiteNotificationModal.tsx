"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface NotificationState {
  isOpen: boolean
  title?: string
  message: string
  type?: "success" | "error" | "info" | "warning"
}

interface SiteNotificationModalProps {
  notification: NotificationState | null
  onClose: () => void
}

export function SiteNotificationModal({ notification, onClose }: SiteNotificationModalProps) {
  const isOpen = Boolean(notification && notification.isOpen)
  const notifType = notification?.type || "info"

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        if (isOpen) {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const icons = {
    success: <CheckCircle2 className="h-7 w-7 text-emerald-500" />,
    error: <XCircle className="h-7 w-7 text-red-500" />,
    warning: <AlertTriangle className="h-7 w-7 text-amber-500" />,
    info: <Info className="h-7 w-7 text-primary" />,
  }

  const borderColors = {
    success: "border-emerald-500/30 bg-emerald-500/5",
    error: "border-red-500/30 bg-red-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    info: "border-primary/30 bg-primary/5",
  }

  return (
    <AnimatePresence>
      {isOpen && notification && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl border ${borderColors[notifType]} p-6 shadow-2xl bg-card text-card-foreground space-y-4 text-center relative pointer-events-auto`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-background border border-border shadow-xs">
              {icons[notifType]}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold tracking-tight text-foreground">
                {notification.title || (notifType === "success" ? "Success" : notifType === "error" ? "Notice" : "System Message")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {notification.message}
              </p>
            </div>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              className="w-full h-10 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              variant={notifType === "error" ? "destructive" : "primary"}
            >
              Acknowledge
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
