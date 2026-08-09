import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function POST(request: NextRequest) {
  try {
    // Rate limit registration: max 10 requests per minute per IP
    const rateLimit = checkRateLimit("auth:register", { limit: 10, windowMs: 60 * 1000 })
    if (!rateLimit.isAllowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait a minute." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      teamId,
      newTeamName,
      newTeamDescription,
      committeeName,
      customRoleTitle,
      systemRole = "USER",
    } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      )
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    // Handle Team resolution
    let targetTeamId = teamId

    // If creating a new organization/team
    if (!targetTeamId && newTeamName) {
      const generatedTeamId = newTeamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `team-${Date.now()}`

      const createdTeam = await prisma.team.create({
        data: {
          id: generatedTeamId,
          name: newTeamName.trim(),
          description: newTeamDescription || null,
        },
      })
      targetTeamId = createdTeam.id
    }

    // Create user in database
    const userId = `user-${Date.now()}`
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        systemRole: systemRole as any,
        provider: "credentials",
      },
    })

    // If member has a team, create the UserTeamRole mapping
    if (targetTeamId && systemRole === "USER") {
      await prisma.userTeamRole.create({
        data: {
          id: `utr-${Date.now()}`,
          userId: newUser.id,
          teamId: targetTeamId,
          committeeName: committeeName?.trim() || null,
          customRoleTitle: customRoleTitle?.trim() || "Member",
        },
      })
    }

    return NextResponse.json(
      {
        message: "Account created successfully!",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          systemRole: newUser.systemRole,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating user account:", error)
    return NextResponse.json(
      { error: "Failed to create user account. Please try again." },
      { status: 500 }
    )
  }
}
