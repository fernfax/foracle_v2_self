"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Bot, Database } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /**
   * HARD RULE: When tools are used, the "Data sources used" collapsible section
   * MUST always appear at the bottom of assistant messages. This provides
   * transparency about which data sources were queried to generate the response.
   */
  toolsUsed?: string[];
  timestamp?: Date;
}

export function ChatMessage({ role, content, toolsUsed, timestamp }: ChatMessageProps) {
  const [showDataUsed, setShowDataUsed] = useState(false);
  const isUser = role === "user";

  const hasDataUsed = toolsUsed && toolsUsed.length > 0;

  // Remove "Data used" section from displayed content (we'll show it separately)
  const displayContent = content
    .replace(/\n*---\n*\*\*Data used:\*\*\s*`[^`]+`\s*$/g, "")
    .trim();

  // User messages: right-aligned speech bubble (ChatGPT style)
  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="bg-slate-800 dark:bg-slate-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
          </div>
          {timestamp && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-muted-foreground">
                {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant messages: left-aligned with avatar
  return (
    <div className="flex gap-3 px-4 py-4 bg-background">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Bot className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Foracle Assistant</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Message content with react-markdown */}
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Headings
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0 text-foreground">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mt-5 mb-2 first:mt-0 text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0 text-foreground">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold mt-3 mb-1 text-muted-foreground">
                  {children}
                </h4>
              ),

              // Paragraphs
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-3 last:mb-0 text-foreground">
                  {children}
                </p>
              ),

              // Lists
              ul: ({ children }) => (
                <ul className="my-3 ml-4 space-y-1.5 text-sm list-none">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-3 ml-4 space-y-2 text-sm list-none counter-reset-item">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-foreground">
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-foreground/50 mt-2" />
                  <span className="flex-1">{children}</span>
                </li>
              ),

              // Strong/Bold - with safety status color coding
              strong: ({ children }) => {
                const text = String(children).toLowerCase();

                // Green status indicators
                if (text.includes("green") || text.includes("safe")) {
                  return (
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-500">
                      {children}
                    </strong>
                  );
                }

                // Yellow/Caution status indicators
                if (text.includes("yellow") || text.includes("caution")) {
                  return (
                    <strong className="font-semibold text-amber-600 dark:text-amber-500">
                      {children}
                    </strong>
                  );
                }

                // Red/At Risk status indicators
                if (text.includes("red") || text.includes("at risk")) {
                  return (
                    <strong className="font-semibold text-red-600 dark:text-red-500">
                      {children}
                    </strong>
                  );
                }

                return <strong className="font-semibold text-foreground">{children}</strong>;
              },

              // Emphasis/Italic
              em: ({ children }) => (
                <em className="italic">{children}</em>
              ),

              // Code
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={cn("text-xs font-mono", className)}>
                    {children}
                  </code>
                );
              },

              // Code blocks
              pre: ({ children }) => (
                <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  {children}
                </pre>
              ),

              // Tables
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-sm divide-y divide-border">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-border">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-sm text-foreground whitespace-nowrap">
                  {children}
                </td>
              ),

              // Horizontal rule
              hr: () => (
                <hr className="my-4 border-border" />
              ),

              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="my-3 border-l-4 border-emerald-500 pl-4 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),

              // Links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/*
          HARD RULE: Data sources section MUST always appear when tools were used.
          This collapsible section shows which data sources (tools) were queried
          to generate the response, ensuring transparency for the user.
        */}
        {hasDataUsed && (
          <div className="mt-4 rounded-lg border bg-muted/30">
            <button
              onClick={() => setShowDataUsed(!showDataUsed)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="border-t px-3 py-2.5">
                <ul className="space-y-1.5">
                  {toolsUsed.map((tool, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{tool}</code>
                      <span className="text-muted-foreground/70">
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

// Tool descriptions for display
function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    get_income_summary: "Income and CPF details",
    get_expenses_summary: "Expense breakdown",
    get_family_summary: "Household structure",
    get_balance_summary: "Balance projections",
  };
  return descriptions[tool] || "";
}
