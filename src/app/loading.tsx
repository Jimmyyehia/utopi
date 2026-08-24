"use client"

import { AppSidebar } from "@/components/layout/AppSidebar"

export default function Loading() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background max-w-full">
      <AppSidebar isOpen={true} onToggle={() => {}} />
      <main className="flex-1 flex flex-col overflow-x-hidden max-w-full transition-all duration-300 min-h-screen ml-0 md:ml-64 p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="h-16 bg-card border border-border/60 rounded-2xl animate-pulse flex items-center justify-between px-6">
          <div className="h-6 w-36 bg-muted/60 rounded-xl" />
          <div className="h-8 w-24 bg-muted/60 rounded-xl" />
        </div>

        {/* Content Canvas Skeleton */}
        <div className="flex-1 bg-card border border-border/60 rounded-3xl animate-pulse p-6 space-y-4">
          <div className="h-8 w-48 bg-muted/60 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="h-40 bg-muted/40 rounded-2xl" />
            <div className="h-40 bg-muted/40 rounded-2xl" />
            <div className="h-40 bg-muted/40 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
