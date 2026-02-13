"use client";

import { useState, useCallback } from "react";
import { ChatView } from "@/components/assistant";

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
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | undefined>();

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
          threadId,
        }),
      });

      const data = await res.json();

      if (data.quota) {
        setQuotaInfo(data.quota);
      }

      if (data.success) {
        // Update thread ID if new
        if (data.threadId && data.threadId !== threadId) {
          setThreadId(data.threadId);
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
          if (data.threadId && data.threadId !== threadId) {
            setThreadId(data.threadId);
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
  }, [threadId]);

  return (
    <ChatView
      messages={messages}
      onSend={handleSendMessage}
      isLoading={isSending}
      error={error}
      quotaInfo={quotaInfo}
    />
  );
}
