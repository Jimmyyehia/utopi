/**
 * High-Performance In-Memory Sliding Window Rate Limiter
 * Protects API routes against denial-of-service, booking spam, and credential brute forcing.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired records every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  limit: number      // Max number of requests allowed in window
  windowMs: number   // Window duration in milliseconds (e.g. 60000 for 1 minute)
}

export interface RateLimitResult {
  isAllowed: boolean
  current: number
  limit: number
  remaining: number
  resetInMs: number
}

/**
 * Checks if an identifier (e.g. client IP or user ID) is within rate limits.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 30, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now()
  const { limit, windowMs } = options

  let record = rateLimitStore.get(identifier)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(identifier, record)
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0]
    const resetInMs = Math.max(0, windowMs - (now - oldest))

    return {
      isAllowed: false,
      current: record.timestamps.length,
      limit,
      remaining: 0,
      resetInMs,
    }
  }

  // Add current timestamp
  record.timestamps.push(now)

  return {
    isAllowed: true,
    current: record.timestamps.length,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetInMs: windowMs,
  }
}
