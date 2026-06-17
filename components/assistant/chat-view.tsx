"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Bot, Sparkles } from "lucide-react"

import { useSidebar } from "@/components/sidebar/sidebar-context"

import { ChatComposer } from "./chat-composer"
import { ChatMessage } from "./chat-message"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolsUsed?: string[]
  createdAt: string
}

interface ChatViewProps {
  messages: Message[]
  onSend: (message: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
  quotaInfo?: {
    used: number
    limit: number
  }
  singlishEnabled?: boolean
  onSinglishToggle?: (enabled: boolean) => Promise<void>
}

export function ChatView({
  messages,
  onSend,
  isLoading = false,
  error = null,
  quotaInfo,
  singlishEnabled = false,
  onSinglishToggle
}: ChatViewProps) {
  const { isExpanded } = useSidebar()
  const [isDesktop, setIsDesktop] = useState(true)
  const latestUserMsgRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(messages.length)

  // Check if we're on desktop
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkIsDesktop()
    window.addEventListener("resize", checkIsDesktop)
    return () => window.removeEventListener("resize", checkIsDesktop)
  }, [])

  // Scroll to bring latest user message to top when a new message is sent
  // Skip for the first message - let it stay near the input until AI replies
  useEffect(() => {
    // Only scroll when a new message is added (not on initial load)
    // And only if there's more than just the first user message (wait for AI reply to push it up)
    const isFirstUserMessage =
      messages.length === 1 && messages[0]?.role === "user"

    if (
      messages.length > prevMessageCount.current &&
      latestUserMsgRef.current &&
      !isFirstUserMessage
    ) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        latestUserMsgRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        })
      }, 100)
    }
    prevMessageCount.current = messages.length
  }, [messages.length, messages])

  const isEmpty = messages.length === 0 && !isLoading && !error

  // Calculate left offset for fixed bottom bar (sidebar width on desktop)
  const sidebarWidth = isDesktop ? (isExpanded ? 260 : 72) : 0

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Messages area - with padding at bottom for fixed composer (extra on mobile for nav) */}
      <div className={isDesktop ? "pb-32" : "pb-52"}>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex min-h-[calc(100vh-12rem)] flex-col justify-end pt-4 pb-4">
            {messages.map((msg, index) => {
              // Find the last user message to attach the scroll ref
              const isLastUserMessage =
                msg.role === "user" &&
                !messages.slice(index + 1).some((m) => m.role === "user")

              return (
                <div
                  key={msg.id}
                  ref={isLastUserMessage ? latestUserMsgRef : null}>
                  <ChatMessage
                    role={msg.role}
                    content={msg.content}
                    toolsUsed={msg.toolsUsed}
                    timestamp={new Date(msg.createdAt)}
                  />
                </div>
              )
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(0,196,170,0.12)] text-[#007A68]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0ms" }}>
                      .
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "150ms" }}>
                      .
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "300ms" }}>
                      .
                    </span>
                  </span>
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="border-destructive/30 bg-destructive/10 mx-4 my-2 flex items-start gap-2 rounded-lg border p-3">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed composer at bottom - respects sidebar width and mobile nav */}
      <div
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed right-0 z-30 backdrop-blur transition-all duration-300"
        style={{
          left: sidebarWidth,
          bottom: isDesktop ? 0 : 72 // Account for mobile bottom nav height
        }}>
        {/* Quota warning */}
        {quotaInfo && quotaInfo.used >= quotaInfo.limit * 0.8 && (
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-2 rounded-lg bg-[rgba(212,168,67,0.15)] px-3 py-2 text-sm text-[#7A5A00]">
              <span className="font-medium">
                {quotaInfo.limit - quotaInfo.used} messages remaining today.
              </span>{" "}
              Quota resets at midnight.
            </div>
          </div>
        )}

        <ChatComposer
          onSend={onSend}
          disabled={
            isLoading || (quotaInfo && quotaInfo.used >= quotaInfo.limit)
          }
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
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,196,170,0.12)]">
        <Sparkles className="h-8 w-8 text-[#007A68]" />
      </div>

      <h2 className="mt-4 text-xl font-semibold">Foracle Assistant</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        I can help you understand your finances, analyze spending patterns, and
        plan for your goals. Ask me anything about your budget!
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <SuggestionCard text="What's my budget summary for this month?" />
        <SuggestionCard text="How much have I spent on food?" />
        <SuggestionCard text="Can I afford a $500 trip this month?" />
        <SuggestionCard text="What are my upcoming expenses?" />
      </div>

      <p className="text-muted-foreground mt-8 text-xs">
        All calculations are performed by verified tools.
        <br />I never calculate numbers myself.
      </p>
    </div>
  )
}

function SuggestionCard({ text }: { text: string }) {
  return (
    <div className="bg-muted/30 text-muted-foreground hover:bg-muted/50 cursor-default rounded-lg border px-3 py-2 text-left text-sm">
      "{text}"
    </div>
  )
}
