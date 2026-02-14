"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  onSend,
  disabled = false,
  placeholder = "Ask about your budget, spending, or financial goals...",
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea with minimum height
  const MIN_HEIGHT = 44; // Consistent minimum height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.max(MIN_HEIGHT, Math.min(textarea.scrollHeight, 200));
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) return;

    setIsSending(true);
    setMessage("");

    try {
      await onSend(trimmedMessage);
    } finally {
      setIsSending(false);
      // Focus back on textarea
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isSending;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <div className="border-t bg-background p-3 sm:p-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-lg border bg-muted/30 p-2 transition-colors",
            isDisabled && "opacity-60"
          )}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={2}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 py-1.5 outline-none min-h-[44px]",
              "text-base sm:text-sm", // 16px on mobile prevents iOS zoom
              "placeholder:text-muted-foreground/60"
            )}
            maxLength={2000}
          />

          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Character count */}
        {message.length > 1500 && (
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {message.length}/2000
          </p>
        )}

        {/* Helper text - hidden on mobile as users tap send button */}
        <p className="mt-2 text-center text-xs text-muted-foreground hidden sm:block">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
