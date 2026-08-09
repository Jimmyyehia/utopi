import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isManager =
      session?.user?.systemRole === "WORKSPACE_MANAGER" ||
      session?.user?.systemRole === "ADMIN" ||
      session?.user?.systemRole === "OWNER"

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        systemRole: true,
        teamRoles: {
          include: {
            team: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isManager =
      session?.user?.systemRole === "WORKSPACE_MANAGER" ||
      session?.user?.systemRole === "ADMIN" ||
      session?.user?.systemRole === "OWNER"

    if (!isManager) {
      return NextResponse.json(
        { error: "Only managers, admins, or owners can directly create users via this endpoint." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, teamId, committeeName, customRoleTitle, systemRole = "USER" } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password || "Utopi2026!", 10)
    const userId = `user-${Date.now()}`

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        systemRole: systemRole as any,
        provider: "credentials",
      },
    })

    if (teamId && systemRole === "USER") {
      await prisma.userTeamRole.create({
        data: {
          id: `utr-${Date.now()}`,
          userId: user.id,
          teamId,
          committeeName: committeeName || null,
          customRoleTitle: customRoleTitle || "Member",
        },
      })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 })
  }
}
