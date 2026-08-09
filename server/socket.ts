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
    origin: ["http://localhost:3000", "http://192.168.192.1:3000"],
    methods: ["GET", "POST"],
  },
})

const db = createClient({ url: `file:${dbPath}` })

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
  console.log("Client connected:", socket.id)

  socket.on("join_room", (roomId: string) => {
    socket.join(`room:${roomId}`)
    console.log(`Client ${socket.id} joined room:${roomId}`)
  })

  socket.on("leave_room", (roomId: string) => {
    socket.leave(`room:${roomId}`)
    console.log(`Client ${socket.id} left room:${roomId}`)
  })

  socket.on("subscribe_bookings", () => {
    socket.join("bookings")
    console.log(`Client ${socket.id} subscribed to bookings`)
  })

  socket.on("unsubscribe_bookings", () => {
    socket.leave("bookings")
    console.log(`Client ${socket.id} unsubscribed from bookings`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

async function broadcastBookingUpdate(update: BookingUpdate) {
  io.to("bookings").emit("booking_update", update)
  
  if (update.booking.roomId) {
    io.to(`room:${update.booking.roomId}`).emit("booking_update", update)
  }
}

async function broadcastRoomStatusUpdate(update: RoomStatusUpdate) {
  io.to(`room:${update.roomId}`).emit("room_status_update", update)
  io.to("bookings").emit("room_status_update", update)
}

async function checkRoomStatus(roomId: string) {
  const now = new Date().toISOString()
  const result = await db.execute({
    sql: `SELECT * FROM bookings WHERE roomId = ? AND status IN ('APPROVED', 'PENDING') AND startTime <= ? AND endTime > ? ORDER BY priorityScore DESC, startTime ASC LIMIT 1`,
    args: [roomId, now, now],
  })

  let status: "available" | "occupied" | "pending" | "maintenance" = "available"
  
  if (result.rows.length > 0) {
    const booking = result.rows[0]
    if (booking.status === "APPROVED") status = "occupied"
    else if (booking.status === "PENDING") status = "pending"
  }

  return status
}

setInterval(async () => {
  try {
    const rooms = await db.execute("SELECT id FROM rooms")
    for (const room of rooms.rows) {
      const status = await checkRoomStatus(room.id as string)
      await broadcastRoomStatusUpdate({
        type: "room_status_changed",
        roomId: room.id as string,
        status,
      })
    }
  } catch (error) {
    console.error("Error checking room statuses:", error)
  }
}, 30000)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io, broadcastBookingUpdate, broadcastRoomStatusUpdate }