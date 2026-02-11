/**
 * Rate Limiter for AI Chat
 * Implements per-user daily message quota and per-thread rate limiting
 */

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

export interface UserQuota {
  userId: string;
  dailyCount: number;
  dailyResetAt: Date;
}

export interface ThreadRateLimit {
  threadId: string;
  lastMessageAt: Date;
  messageCount: number;
  windowResetAt: Date;
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Per-user limits
  DAILY_MESSAGE_QUOTA: 50, // messages per day

  // Per-thread limits
  THREAD_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  THREAD_MAX_MESSAGES_PER_WINDOW: 10, // max 10 messages per minute per thread
  THREAD_MIN_INTERVAL_MS: 2000, // 2 seconds between messages
};

// =============================================================================
// In-Memory Storage (Replace with Redis/DB in production)
// =============================================================================

const userQuotas = new Map<string, UserQuota>();
const threadRateLimits = new Map<string, ThreadRateLimit>();

// =============================================================================
// Helper Functions
// =============================================================================

function getStartOfDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getEndOfDay(): Date {
  const startOfDay = getStartOfDay();
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
}

// =============================================================================
// User Daily Quota
// =============================================================================

export function checkUserDailyQuota(userId: string): RateLimitResult {
  const now = new Date();
  const endOfDay = getEndOfDay();

  let quota = userQuotas.get(userId);

  // Create or reset quota if needed
  if (!quota || now >= quota.dailyResetAt) {
    quota = {
      userId,
      dailyCount: 0,
      dailyResetAt: endOfDay,
    };
    userQuotas.set(userId, quota);
  }

  const remaining = CONFIG.DAILY_MESSAGE_QUOTA - quota.dailyCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: quota.dailyResetAt,
      error: `Daily message limit reached (${CONFIG.DAILY_MESSAGE_QUOTA}/day). Resets at midnight.`,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: quota.dailyResetAt,
  };
}

export function incrementUserDailyQuota(userId: string): void {
  const quota = userQuotas.get(userId);
  if (quota) {
    quota.dailyCount++;
  }
}

export function getUserQuotaInfo(userId: string): { used: number; limit: number; resetAt: Date } {
  const quota = userQuotas.get(userId);
  const now = new Date();

  if (!quota || now >= quota.dailyResetAt) {
    return {
      used: 0,
      limit: CONFIG.DAILY_MESSAGE_QUOTA,
      resetAt: getEndOfDay(),
    };
  }

  return {
    used: quota.dailyCount,
    limit: CONFIG.DAILY_MESSAGE_QUOTA,
    resetAt: quota.dailyResetAt,
  };
}

// =============================================================================
// Thread Rate Limiting
// =============================================================================

export function checkThreadRateLimit(threadId: string): RateLimitResult {
  const now = new Date();

  let limit = threadRateLimits.get(threadId);

  // Create or reset window if needed
  if (!limit || now >= limit.windowResetAt) {
    limit = {
      threadId,
      lastMessageAt: new Date(0), // Beginning of time
      messageCount: 0,
      windowResetAt: new Date(now.getTime() + CONFIG.THREAD_RATE_LIMIT_WINDOW_MS),
    };
    threadRateLimits.set(threadId, limit);
  }

  // Check minimum interval between messages
  const timeSinceLastMessage = now.getTime() - limit.lastMessageAt.getTime();
  if (timeSinceLastMessage < CONFIG.THREAD_MIN_INTERVAL_MS) {
    const waitTime = Math.ceil((CONFIG.THREAD_MIN_INTERVAL_MS - timeSinceLastMessage) / 1000);
    return {
      allowed: false,
      remaining: CONFIG.THREAD_MAX_MESSAGES_PER_WINDOW - limit.messageCount,
      resetAt: new Date(limit.lastMessageAt.getTime() + CONFIG.THREAD_MIN_INTERVAL_MS),
      error: `Please wait ${waitTime} second${waitTime > 1 ? "s" : ""} before sending another message.`,
    };
  }

  // Check messages per window
  if (limit.messageCount >= CONFIG.THREAD_MAX_MESSAGES_PER_WINDOW) {
    const waitSeconds = Math.ceil((limit.windowResetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: limit.windowResetAt,
      error: `Too many messages. Please wait ${waitSeconds} seconds.`,
    };
  }

  return {
    allowed: true,
    remaining: CONFIG.THREAD_MAX_MESSAGES_PER_WINDOW - limit.messageCount,
    resetAt: limit.windowResetAt,
  };
}

export function recordThreadMessage(threadId: string): void {
  const now = new Date();
  const limit = threadRateLimits.get(threadId);

  if (limit) {
    limit.lastMessageAt = now;
    limit.messageCount++;
  }
}

// =============================================================================
// Combined Rate Limit Check
// =============================================================================

export function checkRateLimits(
  userId: string,
  threadId: string
): RateLimitResult {
  // Check user daily quota first
  const userResult = checkUserDailyQuota(userId);
  if (!userResult.allowed) {
    return userResult;
  }

  // Check thread rate limit
  const threadResult = checkThreadRateLimit(threadId);
  if (!threadResult.allowed) {
    return threadResult;
  }

  return {
    allowed: true,
    remaining: Math.min(userResult.remaining, threadResult.remaining),
    resetAt: userResult.resetAt,
  };
}

export function recordMessage(userId: string, threadId: string): void {
  incrementUserDailyQuota(userId);
  recordThreadMessage(threadId);
}

// =============================================================================
// Admin/Testing Functions
// =============================================================================

export function resetUserQuota(userId: string): void {
  userQuotas.delete(userId);
}

export function resetThreadRateLimit(threadId: string): void {
  threadRateLimits.delete(threadId);
}

export function resetAllLimits(): void {
  userQuotas.clear();
  threadRateLimits.clear();
}

// Export config for display purposes
export const RATE_LIMIT_CONFIG = { ...CONFIG };
