"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "outline"
    | "available"
    | "approved"
    | "occupied"
    | "pending"
    | "maintenance"
    | "cash-pending"
    | "paid"
    | "destructive"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-muted text-muted-foreground",
      outline: "border border-border bg-transparent text-foreground",
      available: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold dark:bg-emerald-950 dark:text-emerald-300",
      approved: "bg-emerald-600 text-white font-bold border-transparent shadow-xs",
      occupied: "bg-emerald-600 text-white font-bold border-transparent shadow-xs",
      pending: "bg-amber-100 text-amber-900 border border-amber-300 font-semibold dark:bg-amber-950 dark:text-amber-300",
      maintenance: "bg-gray-100 text-gray-800",
      "cash-pending": "bg-orange-100 text-orange-800",
      paid: "bg-emerald-600 text-white font-bold",
      destructive: "bg-destructive text-destructive-foreground",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }