import { BookingStatus, PaymentStatus, SystemRole } from "@/generated/prisma/client"

export type User = {
  id: string
  name: string | null
  email: string
  image: string | null
  provider: string | null
  systemRole: SystemRole
  createdAt: Date
  updatedAt: Date
}

export type Team = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type UserTeamRole = {
  id: string
  userId: string
  user: User
  teamId: string
  team: Team
  committeeName: string | null
  customRoleTitle: string
  createdAt: Date
}

export type Room = {
  id: string
  name: string
  capacity: number
  hasScreen: boolean
  hasBalcony: boolean
  hasAC: boolean
  hasWhiteboard: boolean
  hasPowerOutlets: boolean
  description: string | null
  svgPolygonCoords: string
  svgX: number
  svgY: number
  color: string
  createdAt: Date
  updatedAt: Date
}

export type Booking = {
  id: string
  roomId: string
  room: Room
  userId: string
  user: User
  teamId: string
  team: Team
  roleTitleUsed: string
  projectOrCommitteeName: string
  startTime: Date
  endTime: Date
  description: string | null
  status: BookingStatus
  paymentStatus: PaymentStatus
  priorityScore: number
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type Notification = {
  id: string
  userId: string
  user: User
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

export type RoomWithBookings = Room & {
  bookings: Booking[]
}

export type BookingWithRelations = Booking & {
  room: Room
  user: User
  team: Team
}

export type UserWithRoles = User & {
  teamRoles: (UserTeamRole & { team: Team })[]
}

export type TeamWithMembers = Team & {
  members: (UserTeamRole & { user: User })[]
}

export type BookingFormData = {
  roomId: string
  teamId: string
  userTeamRoleId: string
  projectOrCommitteeName: string
  startTime: Date
  endTime: Date
  description: string
}

export type BookingFormState = {
  errors?: {
    roomId?: string[]
    teamId?: string[]
    userTeamRoleId?: string[]
    projectOrCommitteeName?: string[]
    startTime?: string[]
    endTime?: string[]
    description?: string[]
  }
  message?: string
  success?: boolean
}

export type RoomStatus = "available" | "occupied" | "pending" | "maintenance"

export type FloorPlanRoom = {
  id: string
  name: string
  path: string
  centerX: number
  centerY: number
  color: string
  status: RoomStatus
  capacity: number
  hasScreen: boolean
  hasBalcony: boolean
  hasAC: boolean
  hasWhiteboard: boolean
  hasPowerOutlets: boolean
  description: string | null
}

export type TooltipData = {
  room: FloorPlanRoom
  nextAvailableSlot?: string
  currentBooking?: {
    teamName: string
    description: string
    endTime: string
  } | null
} | null

export type SidebarState = {
  isOpen: boolean
  room: FloorPlanRoom | null
  bookings: BookingWithRelations[]
}

export type ApprovalQueueItem = BookingWithRelations & {
  userTeamRole: UserTeamRole
  conflictingBookings: BookingWithRelations[]
}

export type DashboardStats = {
  totalRooms: number
  totalBookingsToday: number
  pendingApprovals: number
  occupiedRooms: number
  revenueToday: number
}