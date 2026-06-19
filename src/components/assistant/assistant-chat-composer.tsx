"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { AssistantSinglishToggle } from "@/components/assistant/assistant-singlish-toggle"

interface ChatComposerProps {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  singlishEnabled?: boolean
  onSinglishToggle?: (enabled: boolean) => Promise<void>
}

export function AssistantChatComposer({
  onSend,
  disabled = false,
  placeholder = "Ask about your budget, spending, or financial goals...",
  singlishEnabled = false,
  onSinglishToggle
}: ChatComposerProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea with minimum height
  const MIN_HEIGHT = 44 // Consistent minimum height
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(textarea.scrollHeight, 200)
      )
      textarea.style.height = `${newHeight}px`
    }
  }, [message])

  const handleSubmit = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSending || disabled) return

    setIsSending(true)
    setMessage("")

    try {
      await onSend(trimmedMessage)
    } finally {
      setIsSending(false)
      // Focus back on textarea
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isDisabled = disabled || isSending
  const canSend = message.trim().length > 0 && !isDisabled

  return (
    <div className="bg-background border-t p-3 sm:p-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "bg-muted/30 flex items-end gap-2 rounded-lg border p-2 transition-colors",
            isDisabled && "opacity-60"
          )}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={2}
            className={cn(
              "min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 outline-none",
              "text-base sm:text-sm", // 16px on mobile prevents iOS zoom
              "placeholder:text-muted-foreground/60"
            )}
            maxLength={2000}
          />

          {onSinglishToggle && (
            <AssistantSinglishToggle
              enabled={singlishEnabled}
              onToggle={onSinglishToggle}
              disabled={isDisabled}
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}>
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>

        {/* Character count */}
        {message.length > 1500 && (
          <p className="text-muted-foreground mt-1 text-right text-xs">
            {message.length}/2000
          </p>
        )}

        {/* Helper text - hidden on mobile as users tap send button */}
        <p className="text-muted-foreground mt-2 hidden text-center text-xs sm:block">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
