import { NextRequest, NextResponse } from "next/server"
import { AI_ASSISTANT_ENABLED } from "@/configs/ai.config"
import { auth } from "@clerk/nextjs/server"

import { getUserQuotaInfo } from "@/lib/ai/rate-limiter"
import {
  createThread,
  deleteThread,
  getThread,
  getThreadMessages,
  getUserThreads,
  renameThread
} from "@/lib/ai/threads"

// The assistant is paused/unfinished (in-memory threads + quota; see route note in
// app/api/ai/chat/route.ts). Disabled unless ENABLE_AI_ASSISTANT=true is set
// explicitly per environment (including local dev). Deliberate, not inferred from NODE_ENV.
function aiAssistantEnabled(): boolean {
  return AI_ASSISTANT_ENABLED
}

function featureDisabledResponse() {
  return NextResponse.json(
    { success: false, error: "The assistant is not available yet." },
    { status: 503 }
  )
}

// =============================================================================
// GET - List user's threads
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!aiAssistantEnabled()) return featureDisabledResponse()

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if requesting a specific thread
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")

    if (threadId) {
      // Return specific thread with messages
      const thread = await getThread(threadId)
      if (!thread) {
        return NextResponse.json(
          { success: false, error: "Thread not found" },
          { status: 404 }
        )
      }

      const messages = await getThreadMessages(threadId)
      return NextResponse.json({
        success: true,
        thread: {
          id: thread.id,
          title: thread.title,
          messages,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt
        }
      })
    }

    // Return all threads
    const threads = await getUserThreads()
    const quotaInfo = getUserQuotaInfo(userId)

    return NextResponse.json({
      success: true,
      threads,
      quota: {
        used: quotaInfo.used,
        limit: quotaInfo.limit,
        resetAt: quotaInfo.resetAt.toISOString()
      }
    })
  } catch (error) {
    console.error("[Threads API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch threads" },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new thread
// =============================================================================

export async function POST() {
  try {
    if (!aiAssistantEnabled()) return featureDisabledResponse()

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const thread = await createThread()

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt
      }
    })
  } catch (error) {
    console.error("[Threads API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create thread" },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete a thread
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    if (!aiAssistantEnabled()) return featureDisabledResponse()

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: "Thread ID required" },
        { status: 400 }
      )
    }

    const deleted = await deleteThread(threadId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Threads API] DELETE error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete thread" },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Rename a thread
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    if (!aiAssistantEnabled()) return featureDisabledResponse()

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { threadId, title } = body

    if (!threadId || !title) {
      return NextResponse.json(
        { success: false, error: "Thread ID and title required" },
        { status: 400 }
      )
    }

    const renamed = await renameThread(threadId, title)

    if (!renamed) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Threads API] PATCH error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to rename thread" },
      { status: 500 }
    )
  }
}
