"use client";

import { useState, useEffect, useCallback } from "react";
import { ThreadList, ChatView } from "@/components/assistant";

interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  createdAt: string;
}

interface QuotaInfo {
  used: number;
  limit: number;
  resetAt: string;
}

export function AssistantClient() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | undefined>();

  // Fetch threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Fetch messages when thread changes
  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadMessages(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  const fetchThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const res = await fetch("/api/ai/threads");
      const data = await res.json();

      if (data.success) {
        setThreads(data.threads || []);
        if (data.quota) {
          setQuotaInfo(data.quota);
        }
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/threads?threadId=${threadId}`);
      const data = await res.json();

      if (data.success && data.thread) {
        setMessages(data.thread.messages || []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewThread = useCallback(() => {
    setSelectedThreadId(undefined);
    setMessages([]);
    setError(null);
  }, []);

  const handleSelectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setError(null);
  }, []);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/ai/threads?threadId=${threadId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (selectedThreadId === threadId) {
          setSelectedThreadId(undefined);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
  }, [selectedThreadId]);

  const handleSendMessage = useCallback(async (content: string) => {
    setIsSending(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          threadId: selectedThreadId,
        }),
      });

      const data = await res.json();

      if (data.quota) {
        setQuotaInfo(data.quota);
      }

      if (data.success) {
        // Update thread ID if new
        if (data.threadId && data.threadId !== selectedThreadId) {
          setSelectedThreadId(data.threadId);
        }

        // Add assistant response
        const assistantMsg: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: data.response,
          toolsUsed: data.toolsUsed,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Refresh threads list
        fetchThreads();
      } else {
        // Handle error response
        if (data.response) {
          // Error with response (e.g., tool failure)
          const errorMsg: Message = {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: data.response,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);

          // Update thread if new
          if (data.threadId && data.threadId !== selectedThreadId) {
            setSelectedThreadId(data.threadId);
            fetchThreads();
          }
        } else {
          setError(data.error || "Failed to send message");
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  }, [selectedThreadId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar - Thread list (hidden on mobile) */}
      <div className="hidden md:block w-72 border-r">
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          isLoading={isLoadingThreads}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 min-w-0">
        <ChatView
          messages={messages}
          onSend={handleSendMessage}
          isLoading={isSending || isLoadingMessages}
          error={error}
          quotaInfo={quotaInfo}
        />
      </div>
    </div>
  );
}
