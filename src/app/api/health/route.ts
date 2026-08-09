import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const startTime = Date.now()
  let dbStatus = "healthy"
  let dbLatencyMs = 0

  try {
    const dbPingStart = Date.now()
    // Ping database
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbPingStart
  } catch (error) {
    dbStatus = "unreachable"
    console.error("Health check database ping failed:", error)
  }

  const isHealthy = dbStatus === "healthy"
  const uptimeSeconds = Math.floor(process.uptime())

  const healthData = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    responseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  }

  return NextResponse.json(healthData, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  })
}
