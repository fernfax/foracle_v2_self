"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { Bot, Sparkles, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  createdAt: string;
}

interface ChatViewProps {
  messages: Message[];
  onSend: (message: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  quotaInfo?: {
    used: number;
    limit: number;
  };
}

export function ChatView({
  messages,
  onSend,
  isLoading = false,
  error = null,
  quotaInfo,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0 && !isLoading && !error;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Messages area - with padding at bottom for fixed composer */}
      <div className="pb-32">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="pb-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                toolsUsed={msg.toolsUsed}
                timestamp={new Date(msg.createdAt)}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mx-4 my-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed composer at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Quota warning */}
        {quotaInfo && quotaInfo.used >= quotaInfo.limit * 0.8 && (
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span className="font-medium">
                {quotaInfo.limit - quotaInfo.used} messages remaining today.
              </span>{" "}
              Quota resets at midnight.
            </div>
          </div>
        )}

        <ChatComposer
          onSend={onSend}
          disabled={isLoading || (quotaInfo && quotaInfo.used >= quotaInfo.limit)}
          placeholder={
            quotaInfo && quotaInfo.used >= quotaInfo.limit
              ? "Daily message limit reached. Resets at midnight."
              : undefined
          }
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Sparkles className="h-8 w-8 text-emerald-600" />
      </div>

      <h2 className="mt-4 text-xl font-semibold">Foracle Assistant</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        I can help you understand your finances, analyze spending patterns, and plan for your goals.
        Ask me anything about your budget!
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <SuggestionCard text="What's my budget summary for this month?" />
        <SuggestionCard text="How much have I spent on food?" />
        <SuggestionCard text="Can I afford a $500 trip this month?" />
        <SuggestionCard text="What are my upcoming expenses?" />
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        All calculations are performed by verified tools.
        <br />
        I never calculate numbers myself.
      </p>
    </div>
  );
}

function SuggestionCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50 cursor-default">
      "{text}"
    </div>
  );
}
