"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode, useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"
import { UtopiContextMenuProvider } from "@/components/ui/UtopiContextMenu"

function GlobalSocketListener() {
  const { isConnected, onBookingUpdate, onRoomStatusUpdate } = useSocket()

  useEffect(() => {
    const unsubBooking = onBookingUpdate((data) => {
      window.dispatchEvent(new CustomEvent("utopi:booking_update", { detail: data }))
    })

    const unsubRoom = onRoomStatusUpdate((data) => {
      window.dispatchEvent(new CustomEvent("utopi:room_status_update", { detail: data }))
    })

    return () => {
      unsubBooking()
      unsubRoom()
    }
  }, [onBookingUpdate, onRoomStatusUpdate])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UtopiContextMenuProvider>
        <GlobalSocketListener />
        {children}
      </UtopiContextMenuProvider>
    </SessionProvider>
  )
}