"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Plus,
  Trash2,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: string;
}

interface ThreadListProps {
  threads: ThreadSummary[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  isLoading?: boolean;
}

export function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  isLoading = false,
}: ThreadListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(threadId);
    try {
      await onDeleteThread(threadId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <button
          onClick={onNewThread}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No conversations yet
            </p>
            <button
              onClick={onNewThread}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  selectedThreadId === thread.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{thread.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {thread.lastMessage}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDate(thread.updatedAt)} · {thread.messageCount} messages
                  </p>
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity",
                        "hover:bg-muted-foreground/10 group-hover:opacity-100",
                        selectedThreadId === thread.id && "opacity-100"
                      )}
                    >
                      {deletingId === thread.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MoreVertical className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(thread.id, e as unknown as React.MouseEvent)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
