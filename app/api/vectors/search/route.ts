/**
 * Vector Search API
 *
 * POST /api/vectors/search
 *
 * Search the knowledge base and optionally the user's private documents.
 * Authentication is required for ALL sources: the embedding + pgvector query is
 * a paid, unbounded-cost operation and must never run for anonymous callers.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import {
  buildContextFromResults,
  searchAll,
  searchKnowledgeBase,
  searchUserChunks
} from "@/lib/vectors"

const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  source: z.enum(["kb", "user", "all"]).default("all"),
  // Clamp the row limit so a client cannot ask the DB for an unbounded result set.
  limit: z.number().int().min(1).max(20).default(5),
  minSimilarity: z.number().min(0).max(1).default(0.7),
  docId: z.string().max(200).optional(),
  buildContext: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication up front — previously the `kb` source ran the paid
    // embedding + pgvector query for unauthenticated callers with an unclamped limit.
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = searchRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { query, source, limit, minSimilarity, docId, buildContext } =
      parsed.data

    const options = { limit, minSimilarity, docId }

    let results
    switch (source) {
      case "kb":
        results = await searchKnowledgeBase(query, options)
        break
      case "user":
        results = await searchUserChunks(userId, query, options)
        break
      case "all":
      default:
        results = await searchAll(userId, query, options)
    }

    const response: {
      results: typeof results
      context?: string
      query: string
      source: string
    } = {
      results,
      query,
      source
    }

    // Optionally build a context string for AI consumption.
    if (buildContext && results.length > 0) {
      response.context = buildContextFromResults(results)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Vector search error:", error)
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    )
  }
}
