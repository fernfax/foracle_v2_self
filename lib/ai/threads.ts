"use server";

import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  createdAt: Date;
}

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  lastResponseId?: string;
  orchestratorConversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: Date;
}

// =============================================================================
// In-Memory Storage (Replace with DB in production)
// =============================================================================

const threads = new Map<string, ChatThread>();

// =============================================================================
// Helper Functions
// =============================================================================

function generateTitle(firstMessage: string): string {
  // Generate a short title from the first message
  const cleaned = firstMessage.replace(/\n/g, " ").trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.slice(0, 37) + "...";
}

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// =============================================================================
// Thread Operations
// =============================================================================

export async function createThread(firstMessage?: string): Promise<ChatThread> {
  const userId = await getCurrentUserId();

  const thread: ChatThread = {
    id: `thread_${randomUUID()}`,
    userId,
    title: firstMessage ? generateTitle(firstMessage) : "New conversation",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  threads.set(thread.id, thread);
  return thread;
}

export async function getThread(threadId: string): Promise<ChatThread | null> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    return null;
  }

  return thread;
}

export async function getUserThreads(): Promise<ThreadSummary[]> {
  const userId = await getCurrentUserId();

  const userThreads: ThreadSummary[] = [];

  for (const thread of threads.values()) {
    if (thread.userId === userId) {
      const lastMsg = thread.messages[thread.messages.length - 1];
      userThreads.push({
        id: thread.id,
        title: thread.title,
        lastMessage: lastMsg?.content.slice(0, 100) || "No messages yet",
        messageCount: thread.messages.length,
        updatedAt: thread.updatedAt,
      });
    }
  }

  // Sort by most recent first
  return userThreads.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export async function addMessageToThread(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  toolsUsed?: string[]
): Promise<ChatMessage> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    throw new Error("Thread not found");
  }

  const message: ChatMessage = {
    id: `msg_${randomUUID()}`,
    role,
    content,
    toolsUsed,
    createdAt: new Date(),
  };

  thread.messages.push(message);
  thread.updatedAt = new Date();

  // Update title if this is the first user message
  if (role === "user" && thread.messages.filter((m) => m.role === "user").length === 1) {
    thread.title = generateTitle(content);
  }

  return message;
}

export async function updateThreadResponseId(
  threadId: string,
  responseId: string,
  orchestratorConversationId?: string
): Promise<void> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    throw new Error("Thread not found");
  }

  thread.lastResponseId = responseId;
  if (orchestratorConversationId) {
    thread.orchestratorConversationId = orchestratorConversationId;
  }
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    return false;
  }

  threads.delete(threadId);
  return true;
}

export async function renameThread(
  threadId: string,
  newTitle: string
): Promise<boolean> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    return false;
  }

  thread.title = newTitle.slice(0, 100);
  thread.updatedAt = new Date();
  return true;
}

// =============================================================================
// Thread Messages Operations
// =============================================================================

export async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    return [];
  }

  return thread.messages;
}

export async function clearThreadMessages(threadId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const thread = threads.get(threadId);

  if (!thread || thread.userId !== userId) {
    return false;
  }

  thread.messages = [];
  thread.lastResponseId = undefined;
  thread.orchestratorConversationId = undefined;
  thread.updatedAt = new Date();
  return true;
}
