"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { io, Socket } from "socket.io-client"
import type { FloorPlanRoom, BookingWithRelations } from "@/types"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"

interface BookingUpdateData {
  type: "booking_created" | "booking_updated" | "booking_deleted"
  booking: BookingWithRelations
}

interface RoomStatusUpdateData {
  type: "room_status_changed"
  roomId: string
  status: FloorPlanRoom["status"]
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Use pure websocket transport with limited reconnect attempts to prevent network polling lag
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 2,
      timeout: 1500,
      autoConnect: true,
    })

    socketRef.current = newSocket

    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("subscribe_bookings")
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    newSocket.on("connect_error", () => {
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit("unsubscribe_bookings")
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("join_room", roomId)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("leave_room", roomId)
  }, [])

  const onBookingUpdate = useCallback((callback: (data: BookingUpdateData) => void) => {
    const s = socketRef.current
    s?.on("booking_update", callback)
    return () => {
      s?.off("booking_update", callback)
    }
  }, [])

  const onRoomStatusUpdate = useCallback((callback: (data: RoomStatusUpdateData) => void) => {
    const s = socketRef.current
    s?.on("room_status_update", callback)
    return () => {
      s?.off("room_status_update", callback)
    }
  }, [])

  return {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    onBookingUpdate,
    onRoomStatusUpdate,
  }
}

export function useRealtimeBookings(initialBookings: BookingWithRelations[]) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>(initialBookings)
  const prevSignatureRef = useRef<string>("")
  const { onBookingUpdate } = useSocket()

  useEffect(() => {
    const currentSignature = (initialBookings || [])
      .map((b) => `${b.id}-${b.updatedAt || ""}-${b.status || ""}`)
      .join("|")
    if (currentSignature !== prevSignatureRef.current) {
      prevSignatureRef.current = currentSignature
      setBookings(initialBookings)
    }
  }, [initialBookings])

  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      setBookings((prev) => {
        const booking = data.booking
        if (data.type === "booking_created") {
          return [...prev.filter((b) => b.id !== booking.id), booking]
        } else if (data.type === "booking_updated") {
          return prev.map((b) => (b.id === booking.id ? booking : b))
        } else if (data.type === "booking_deleted") {
          return prev.filter((b) => b.id !== booking.id)
        }
        return prev
      })
    })

    return () => {
      unsubscribe()
    }
  }, [onBookingUpdate])

  return bookings
}

export function useRealtimeRoomStatus(initialRooms: FloorPlanRoom[]) {
  const [rooms, setRooms] = useState<FloorPlanRoom[]>(initialRooms)
  const prevSignatureRef = useRef<string>("")
  const { onRoomStatusUpdate } = useSocket()

  useEffect(() => {
    const currentSignature = (initialRooms || []).map((r) => `${r.id}-${r.status || ""}`).join("|")
    if (currentSignature !== prevSignatureRef.current) {
      prevSignatureRef.current = currentSignature
      setRooms(initialRooms)
    }
  }, [initialRooms])

  useEffect(() => {
    const unsubscribe = onRoomStatusUpdate((data) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId ? { ...room, status: data.status } : room
        )
      )
    })

    return () => {
      unsubscribe()
    }
  }, [onRoomStatusUpdate])

  return rooms
}