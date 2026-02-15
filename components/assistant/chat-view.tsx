"use client";

import { useEffect, useState, useRef } from "react";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { Bot, Sparkles, AlertCircle } from "lucide-react";
import { useSidebar } from "@/components/sidebar/sidebar-context";

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
  singlishEnabled?: boolean;
  onSinglishToggle?: (enabled: boolean) => Promise<void>;
}

export function ChatView({
  messages,
  onSend,
  isLoading = false,
  error = null,
  quotaInfo,
  singlishEnabled = false,
  onSinglishToggle,
}: ChatViewProps) {
  const { isExpanded } = useSidebar();
  const [isDesktop, setIsDesktop] = useState(true);
  const latestUserMsgRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  // Check if we're on desktop
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // Scroll to bring latest user message to top when a new message is sent
  // Skip for the first message - let it stay near the input until AI replies
  useEffect(() => {
    // Only scroll when a new message is added (not on initial load)
    // And only if there's more than just the first user message (wait for AI reply to push it up)
    const isFirstUserMessage = messages.length === 1 && messages[0]?.role === "user";

    if (messages.length > prevMessageCount.current && latestUserMsgRef.current && !isFirstUserMessage) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        latestUserMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, messages]);

  const isEmpty = messages.length === 0 && !isLoading && !error;

  // Calculate left offset for fixed bottom bar (sidebar width on desktop)
  const sidebarWidth = isDesktop ? (isExpanded ? 260 : 72) : 0;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Messages area - with padding at bottom for fixed composer (extra on mobile for nav) */}
      <div className={isDesktop ? "pb-32" : "pb-52"}>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="pt-4 pb-4 min-h-[calc(100vh-12rem)] flex flex-col justify-end">
            {messages.map((msg, index) => {
              // Find the last user message to attach the scroll ref
              const isLastUserMessage = msg.role === "user" &&
                !messages.slice(index + 1).some(m => m.role === "user");

              return (
                <div key={msg.id} ref={isLastUserMessage ? latestUserMsgRef : null}>
                  <ChatMessage
                    role={msg.role}
                    content={msg.content}
                    toolsUsed={msg.toolsUsed}
                    timestamp={new Date(msg.createdAt)}
                  />
                </div>
              );
            })}

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
          </div>
        )}
      </div>

      {/* Fixed composer at bottom - respects sidebar width and mobile nav */}
      <div
        className="fixed right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-300"
        style={{
          left: sidebarWidth,
          bottom: isDesktop ? 0 : 72, // Account for mobile bottom nav height
        }}
      >
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
          singlishEnabled={singlishEnabled}
          onSinglishToggle={onSinglishToggle}
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
