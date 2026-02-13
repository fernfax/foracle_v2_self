/**
 * Vector Search API
 *
 * POST /api/vectors/search
 *
 * Search the knowledge base and optionally user's private documents.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  searchKnowledgeBase,
  searchUserChunks,
  searchAll,
  buildContextFromResults,
} from "@/lib/vectors";

interface SearchRequestBody {
  query: string;
  source?: "kb" | "user" | "all";
  limit?: number;
  minSimilarity?: number;
  docId?: string;
  buildContext?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    const body: SearchRequestBody = await request.json();
    const {
      query,
      source = "all",
      limit = 5,
      minSimilarity = 0.7,
      docId,
      buildContext = false,
    } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required and must be a string" },
        { status: 400 }
      );
    }

    // For user or all source, require authentication
    if ((source === "user" || source === "all") && !userId) {
      return NextResponse.json(
        { error: "Authentication required for user document search" },
        { status: 401 }
      );
    }

    const options = { limit, minSimilarity, docId };

    let results;
    switch (source) {
      case "kb":
        results = await searchKnowledgeBase(query, options);
        break;
      case "user":
        if (!userId) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }
        results = await searchUserChunks(userId, query, options);
        break;
      case "all":
      default:
        if (!userId) {
          // Fall back to KB only for unauthenticated users
          results = await searchKnowledgeBase(query, options);
        } else {
          results = await searchAll(userId, query, options);
        }
    }

    const response: {
      results: typeof results;
      context?: string;
      query: string;
      source: string;
    } = {
      results,
      query,
      source,
    };

    // Optionally build context string for AI
    if (buildContext && results.length > 0) {
      response.context = buildContextFromResults(results);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Vector search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
