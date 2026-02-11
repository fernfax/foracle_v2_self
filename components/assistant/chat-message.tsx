"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, User, Bot, Database } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  timestamp?: Date;
}

export function ChatMessage({ role, content, toolsUsed, timestamp }: ChatMessageProps) {
  const [showDataUsed, setShowDataUsed] = useState(false);
  const isUser = role === "user";

  // Extract "Data used" section from content if present
  const dataUsedMatch = content.match(/\*\*Data used:\*\*\s*`([^`]+)`/);
  const hasDataUsed = toolsUsed && toolsUsed.length > 0;

  // Remove "Data used" section from displayed content (we'll show it separately)
  const displayContent = content
    .replace(/\n*---\n*\*\*Data used:\*\*\s*`[^`]+`\s*$/g, "")
    .trim();

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-700"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "You" : "Foracle Assistant"}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Message content with markdown-style formatting */}
        <div className="prose prose-sm max-w-none text-foreground">
          <MessageContent content={displayContent} />
        </div>

        {/* Data Used collapsible section */}
        {hasDataUsed && (
          <div className="mt-3 rounded-md border bg-muted/50">
            <button
              onClick={() => setShowDataUsed(!showDataUsed)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5" />
                Data sources used ({toolsUsed.length})
              </span>
              {showDataUsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showDataUsed && (
              <div className="border-t px-3 py-2">
                <ul className="space-y-1">
                  {toolsUsed.map((tool, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <code className="rounded bg-muted px-1.5 py-0.5">{tool}</code>
                      <span className="text-muted-foreground/60">
                        {getToolDescription(tool)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple markdown-like content renderer
function MessageContent({ content }: { content: string }) {
  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, idx) => {
        // Check for headers
        if (paragraph.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-base font-semibold mt-4 first:mt-0">
              {paragraph.slice(3)}
            </h3>
          );
        }
        if (paragraph.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-semibold mt-3 text-muted-foreground">
              {paragraph.slice(4)}
            </h4>
          );
        }

        // Check for horizontal rule
        if (paragraph.trim() === "---") {
          return <hr key={idx} className="my-3 border-muted" />;
        }

        // Check for tables (simple markdown tables)
        if (paragraph.includes("|") && paragraph.includes("-")) {
          return <SimpleTable key={idx} content={paragraph} />;
        }

        // Check for numbered lists (1. 2. 3.)
        if (paragraph.match(/^\d+\.\s/m)) {
          return <NumberedList key={idx} content={paragraph} />;
        }

        // Check for bullet lists
        if (paragraph.match(/^[-*]\s/m)) {
          return <BulletList key={idx} content={paragraph} />;
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-sm leading-relaxed">
            <InlineFormatting text={paragraph} />
          </p>
        );
      })}
    </div>
  );
}

// Bullet list with nested item support
function BulletList({ content }: { content: string }) {
  const lines = content.split(/\n/);
  const items: { text: string; indent: number }[] = [];

  for (const line of lines) {
    const match = line.match(/^(\s*)[-*]\s(.+)/);
    if (match) {
      const indent = Math.floor(match[1].length / 2);
      items.push({ text: match[2], indent });
    }
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2"
          style={{ marginLeft: `${item.indent * 16}px` }}
        >
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-foreground/60" />
          <span><InlineFormatting text={item.text} /></span>
        </li>
      ))}
    </ul>
  );
}

// Numbered list with nested item support
function NumberedList({ content }: { content: string }) {
  const lines = content.split(/\n/);
  const items: { text: string; number: string; subItems: string[] }[] = [];

  let currentItem: { text: string; number: string; subItems: string[] } | null = null;

  for (const line of lines) {
    // Main numbered item (1. 2. etc)
    const mainMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (mainMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = { number: mainMatch[1], text: mainMatch[2], subItems: [] };
      continue;
    }

    // Sub-item (indented with - or *)
    const subMatch = line.match(/^\s+[-*]\s+(.+)/);
    if (subMatch && currentItem) {
      currentItem.subItems.push(subMatch[1]);
    }
  }
  if (currentItem) items.push(currentItem);

  return (
    <ol className="space-y-3 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {item.number}
          </span>
          <div className="flex-1 pt-0.5">
            <div><InlineFormatting text={item.text} /></div>
            {item.subItems.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                {item.subItems.map((sub, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                    <span><InlineFormatting text={sub} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// Handle inline formatting (bold, code, etc.)
function InlineFormatting({ text }: { text: string }) {
  // Replace **bold** with <strong>
  // Replace `code` with <code>
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={idx} className="rounded bg-muted px-1 py-0.5 text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

// Simple markdown table renderer
function SimpleTable({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return <p className="text-sm">{content}</p>;

  const headerLine = lines[0];
  const dataLines = lines.slice(2); // Skip header and separator

  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);
  const rows = dataLines.map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5">
                  <InlineFormatting text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tool descriptions for display
function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    get_month_summary: "Monthly budget overview",
    get_remaining_budget: "Category budget breakdown",
    get_upcoming_expenses: "Planned expenses",
    compute_trip_budget: "Trip affordability analysis",
    get_income_summary: "Income and CPF details",
    get_expenses_summary: "Expense breakdown",
    get_summary_range: "Date range summary",
  };
  return descriptions[tool] || "";
}
