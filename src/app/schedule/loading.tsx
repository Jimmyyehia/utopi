"use client"

import { AppSidebar } from "@/components/layout/AppSidebar"

export default function ScheduleLoading() {
  return (
    <div className="flex min-h-screen bg-background max-w-full overflow-x-hidden">
      <AppSidebar isOpen={true} onToggle={() => {}} />
      <main className="flex-1 flex flex-col transition-all duration-300 min-h-screen ml-0 md:ml-64 p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="h-16 bg-card border border-border/60 rounded-2xl animate-pulse flex items-center justify-between px-6">
          <div className="h-6 w-44 bg-muted/60 rounded-xl" />
          <div className="h-8 w-32 bg-muted/60 rounded-xl" />
        </div>

        {/* Filters Skeleton */}
        <div className="h-12 bg-card border border-border/60 rounded-2xl animate-pulse" />

        {/* Grid Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 bg-card border border-border/60 rounded-2xl animate-pulse" />
          <div className="h-48 bg-card border border-border/60 rounded-2xl animate-pulse" />
          <div className="h-48 bg-card border border-border/60 rounded-2xl animate-pulse" />
        </div>
      </main>
    </div>
  )
}
