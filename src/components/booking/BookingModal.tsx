"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { X, Calendar, Clock, Users, Building2, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn, calculatePriorityScore } from "@/lib/utils"
import type { UserTeamRole, Team, Room, BookingFormData } from "@/types"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BookingFormData) => Promise<void>
  userRoles: (UserTeamRole & { team: Team })[]
  rooms: Room[]
  initialRoomId?: string
  initialDate?: Date
  isLoading?: boolean
}

const bookingSchema = z
  .object({
    roomId: z.string().min(1, "Please select a room"),
    userTeamRoleId: z.string().optional(),
    projectOrCommitteeName: z.string().min(1, "Please enter a project or session name"),
    startTime: z.date({ message: "Please select a valid start date & time" }),
    endTime: z.date({ message: "Please select a valid end date & time" }),
    description: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time ('To') must be after start time ('From')",
    path: ["endTime"],
  })
  .refine((data) => data.endTime > new Date(), {
    message: "Cannot create a booking in the past. The end time ('To') must be after the current time.",
    path: ["endTime"],
  })

type BookingFormValues = z.infer<typeof bookingSchema>

function RoleSelector({
  userRoles,
  value,
  onChange,
  disabled,
  error,
}: {
  userRoles: (UserTeamRole & { team: Team })[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}) {
  const groupedRoles = userRoles.reduce((acc, role) => {
    const key = role.team.id
    if (!acc[key]) {
      acc[key] = { team: role.team, roles: [] }
    }
    acc[key].roles.push(role)
    return acc
  }, {} as Record<string, { team: Team; roles: (UserTeamRole & { team: Team })[] }>)

  return (
    <div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn("w-full bg-card", error && "border-destructive")}>
          <SelectValue placeholder="Select your role for this booking" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {Object.entries(groupedRoles).map(([teamId, group], idx) => (
            <SelectGroup key={teamId}>
              {idx > 0 && <SelectSeparator />}
              <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold px-2 py-1.5">
                {group.team.name}
              </SelectLabel>
              {group.roles.map((role) => (
                <SelectItem
                  key={role.id}
                  value={role.id}
                  className="cursor-pointer py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{role.customRoleTitle}</span>
                    {role.committeeName ? (
                      <span className="text-xs text-primary font-medium">
                        Committee: {role.committeeName}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        General Member
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

// Generate 30-minute interval time options between 9:00 AM and 10:00 PM
const HALF_HOUR_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const totalMinutes = 9 * 60 + i * 30 // Start at 9:00 AM
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  const displayLabel = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return { value: timeString, label: displayLabel }
})

function DateTimePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  disabled,
}: {
  label: string
  value: Date | null | undefined
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  error?: string
  disabled?: boolean
}) {
  const currentDate = value || new Date()
  const dateString = currentDate.toISOString().split("T")[0]
  
  // Snap minutes to nearest 30
  const currentMinutes = currentDate.getMinutes()
  const snappedMinutes = currentMinutes < 15 ? 0 : currentMinutes < 45 ? 30 : 0
  const currentHours = currentMinutes >= 45 ? currentDate.getHours() + 1 : currentDate.getHours()
  const timeString = `${String(Math.min(22, Math.max(9, currentHours))).padStart(2, "0")}:${String(snappedMinutes).padStart(2, "0")}`

  const handleDateChange = (newDateStr: string) => {
    if (!newDateStr) return
    const [year, month, day] = newDateStr.split("-").map(Number)
    const updated = new Date(currentDate)
    updated.setFullYear(year, month - 1, day)
    onChange(updated)
  }

  const handleTimeChange = (newTimeStr: string) => {
    if (!newTimeStr) return
    const [hours, minutes] = newTimeStr.split(":").map(Number)
    const updated = new Date(currentDate)
    updated.setHours(hours, minutes, 0, 0)
    onChange(updated)
  }

  const minDateString = minDate ? minDate.toISOString().split("T")[0] : undefined
  const maxDateString = maxDate ? maxDate.toISOString().split("T")[0] : undefined

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="date"
          value={dateString}
          onChange={(e) => handleDateChange(e.target.value)}
          min={minDateString}
          max={maxDateString}
          disabled={disabled}
          className={cn("flex-1", error && "border-destructive")}
        />
        <Select value={timeString} onValueChange={handleTimeChange} disabled={disabled}>
          <SelectTrigger className="w-36 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {HALF_HOUR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

export function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  userRoles,
  rooms,
  initialRoomId,
  initialDate,
  isLoading,
}: BookingModalProps) {
  const [selectedRole, setSelectedRole] = useState<(UserTeamRole & { team: Team }) | undefined>()

  // Calculate clean initial start time snapped to next half hour between 9:00 AM and 10:00 PM
  const getInitialStartTime = () => {
    const base = initialDate ? new Date(initialDate) : new Date()
    const minutes = base.getMinutes()
    if (minutes > 0 && minutes <= 30) {
      base.setMinutes(30, 0, 0)
    } else if (minutes > 30) {
      base.setHours(base.getHours() + 1, 0, 0, 0)
    } else {
      base.setSeconds(0, 0)
    }

    if (base.getHours() < 9) {
      base.setHours(9, 0, 0, 0)
    } else if (base.getHours() >= 21 && base.getMinutes() > 30) {
      base.setDate(base.getDate() + 1)
      base.setHours(9, 0, 0, 0)
    }
    return base
  }

  const defaultStart = getInitialStartTime()
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000) // Default 1 hour duration

  const { data: session } = useSession()
  const isManagement =
    session?.user?.systemRole === "OWNER" ||
    session?.user?.systemRole === "WORKSPACE_MANAGER" ||
    session?.user?.systemRole === "ADMIN"

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      roomId: initialRoomId || (rooms.length > 0 ? rooms[0].id : ""),
      userTeamRoleId: userRoles.length > 0 ? userRoles[0].id : "",
      projectOrCommitteeName: isManagement ? `${session?.user?.name || "Management"} Session` : "",
      startTime: defaultStart,
      endTime: defaultEnd,
      description: "",
    },
  })

  const watchedRoleId = watch("userTeamRoleId")

  useEffect(() => {
    if (initialRoomId) {
      setValue("roomId", initialRoomId)
    }
  }, [initialRoomId, setValue])

  useEffect(() => {
    if (isManagement) {
      if (!watch("projectOrCommitteeName")) {
        setValue("projectOrCommitteeName", `${session?.user?.name || "Management"} Session`, { shouldValidate: true })
      }
    } else {
      const role = userRoles.find((r) => r.id === watchedRoleId)
      setSelectedRole(role)
      if (role) {
        setValue("projectOrCommitteeName", role.committeeName || role.team.name, { shouldValidate: true })
      }
    }
  }, [watchedRoleId, userRoles, setValue, isManagement, session?.user?.name])

  const handleRoleChange = useCallback(
    (roleId: string) => {
      setValue("userTeamRoleId", roleId, { shouldValidate: true })
    },
    [setValue]
  )

  const onFormSubmit = async (data: BookingFormValues) => {
    const activeRole = userRoles.find((r) => r.id === data.userTeamRoleId)
    await onSubmit({
      roomId: data.roomId,
      teamId: activeRole?.team.id || "",
      userTeamRoleId: data.userTeamRoleId || (isManagement ? "management-role" : ""),
      projectOrCommitteeName: data.projectOrCommitteeName,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description || "",
    })
  }

  const selectedRoomDetails = rooms.find((r) => r.id === watch("roomId"))

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <span>{isManagement ? "Direct Management Reservation" : "New Room Booking Request"}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {isManagement
                  ? "As workspace management, your room reservation is accepted automatically without queueing."
                  : "Choose your team identity, select a room, and schedule your booking. Workspace manager approval is required."}
              </DialogDescription>
            </DialogHeader>

            <form
              id="booking-form"
              onSubmit={handleSubmit(onFormSubmit)}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin"
            >
              {/* Identity / Role Section */}
              {isManagement ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Management Authority ({session?.user?.systemRole})
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold">
                      Auto-Approved
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Booking directly as <strong className="text-foreground">{session?.user?.name}</strong>. Reservation is accepted immediately.
                  </p>
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      Booking Identity & Role
                    </span>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
                      Required: Select 1 Role
                    </Badge>
                  </div>

                  {userRoles.length === 0 ? (
                    <p className="text-sm text-destructive py-2">
                      No team roles found. Please join a team or sign in with a team account first.
                    </p>
                  ) : (
                    <RoleSelector
                      userRoles={userRoles}
                      value={watch("userTeamRoleId") || ""}
                      onChange={handleRoleChange}
                      disabled={isSubmitting || isLoading}
                      error={errors.userTeamRoleId?.message}
                    />
                  )}
                </div>
              )}

              {/* Room & Committee Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="room-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected Room
                  </Label>
                  <Controller
                    name="roomId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting || isLoading}
                      >
                        <SelectTrigger id="room-select" className={cn("w-full bg-card", errors.roomId && "border-destructive")}>
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              <div className="flex flex-col text-left py-0.5">
                                <span className="font-semibold text-foreground">{room.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Capacity: {room.capacity} seats {room.hasBalcony ? "• Balcony" : ""} {room.hasScreen ? "• TV/Screen" : ""}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.roomId && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.roomId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-committee" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Project / Committee Name
                  </Label>
                  <Input
                    id="project-committee"
                    {...register("projectOrCommitteeName")}
                    placeholder="e.g. Q3 Campaign or PR"
                    className={cn(errors.projectOrCommitteeName && "border-destructive")}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.projectOrCommitteeName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.projectOrCommitteeName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Time Selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      label="Start Time"
                      value={field.value}
                      minDate={new Date()}
                      onChange={field.onChange}
                      error={errors.startTime?.message}
                      disabled={isSubmitting || isLoading}
                    />
                  )}
                />

                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      label="End Time"
                      value={field.value}
                      minDate={new Date()}
                      onChange={field.onChange}
                      error={errors.endTime?.message}
                      disabled={isSubmitting || isLoading}
                    />
                  )}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Meeting Purpose / Agenda (Optional)
                </Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="Strategy session, client presentation, sprint planning..."
                  disabled={isSubmitting || isLoading}
                />
              </div>

              {/* Summary Card */}
              {selectedRole && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-foreground border-b border-border/60 pb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Booking Request Preview
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Role: {selectedRole.customRoleTitle}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                    <div>
                      <span className="block font-medium text-foreground">Submitting as:</span>
                      <span>{selectedRole.customRoleTitle} ({selectedRole.team.name})</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Room:</span>
                      <span>{selectedRoomDetails?.name || "Selected Room"}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Payment Method:</span>
                      <span className="text-orange-600 font-semibold">Cash on Arrival at Desk</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Status:</span>
                      <span className="text-yellow-600 font-semibold">Pending Manager Review</span>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <DialogFooter className="p-4 px-6 border-t border-border bg-card flex flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="booking-form"
                disabled={isSubmitting || isLoading || userRoles.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Submit for Approval
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}