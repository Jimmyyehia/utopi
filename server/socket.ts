import { createServer } from "http"
import { Server } from "socket.io"
import { createClient } from "@libsql/client"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dbPath = join(__dirname, "..", "dev.db")

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN || undefined

let db: any = null
try {
  db = createClient({
    url: dbUrl,
    authToken: dbAuthToken,
  })
} catch (e) {
  console.warn("LibSQL client init fallback:", e)
  db = createClient({ url: `file:${dbPath}` })
}

interface BookingUpdate {
  type: "booking_created" | "booking_updated" | "booking_deleted"
  booking: Record<string, unknown>
}

interface RoomStatusUpdate {
  type: "room_status_changed"
  roomId: string
  status: "available" | "occupied" | "pending" | "maintenance"
}

io.on("connection", (socket) => {
  console.log("Client connected to WebSockets:", socket.id)

  socket.on("join_room", (roomId: string) => {
    socket.join(`room:${roomId}`)
  })

  socket.on("leave_room", (roomId: string) => {
    socket.leave(`room:${roomId}`)
  })

  socket.on("subscribe_bookings", () => {
    socket.join("bookings")
  })

  socket.on("unsubscribe_bookings", () => {
    socket.leave("bookings")
  })

  socket.on("subscribe_teams", () => {
    socket.join("teams")
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

async function broadcastBookingUpdate(update: BookingUpdate) {
  io.to("bookings").emit("booking_update", update)
  if (update.booking && (update.booking as any).roomId) {
    io.to(`room:${(update.booking as any).roomId}`).emit("booking_update", update)
  }
}

async function broadcastRoomStatusUpdate(update: RoomStatusUpdate) {
  io.to(`room:${update.roomId}`).emit("room_status_update", update)
  io.to("bookings").emit("room_status_update", update)
}

async function checkRoomStatus(roomId: string) {
  if (!db) return "available"
  try {
    const now = new Date().toISOString()
    const result = await db.execute({
      sql: `SELECT * FROM bookings WHERE roomId = ? AND status IN ('APPROVED', 'PENDING') AND startTime <= ? AND endTime > ? ORDER BY priorityScore DESC, startTime ASC LIMIT 1`,
      args: [roomId, now, now],
    })

    let status: "available" | "occupied" | "pending" | "maintenance" = "available"
    if (result.rows && result.rows.length > 0) {
      const booking = result.rows[0]
      if (booking.status === "APPROVED") status = "occupied"
      else if (booking.status === "PENDING") status = "pending"
    }
    return status
  } catch {
    return "available"
  }
}

// Background status poller
setInterval(async () => {
  try {
    if (!db) return
    const rooms = await db.execute("SELECT id FROM rooms")
    if (rooms.rows) {
      for (const room of rooms.rows) {
        const status = await checkRoomStatus(room.id as string)
        await broadcastRoomStatusUpdate({
          type: "room_status_changed",
          roomId: room.id as string,
          status,
        })
      }
    }
  } catch (error) {
    // Ignore polling errors
  }
}, 30000)

const PORT = Number(process.env.PORT || process.env.SOCKET_PORT || 3001)
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io, broadcastBookingUpdate, broadcastRoomStatusUpdate }