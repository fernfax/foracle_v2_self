"use client"

import { useState } from "react"
import { Bot, ChevronDown, ChevronUp, Database } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  /**
   * HARD RULE: When tools are used, the "Data sources used" collapsible section
   * MUST always appear at the bottom of assistant messages. This provides
   * transparency about which data sources were queried to generate the response.
   */
  toolsUsed?: string[]
  timestamp?: Date
}

export function ChatMessage({
  role,
  content,
  toolsUsed,
  timestamp
}: ChatMessageProps) {
  const [showDataUsed, setShowDataUsed] = useState(false)
  const isUser = role === "user"

  const hasDataUsed = toolsUsed && toolsUsed.length > 0

  // Remove "Data used" section from displayed content (we'll show it separately)
  const displayContent = content
    .replace(/\n*---\n*\*\*Data used:\*\*\s*`[^`]+`\s*$/g, "")
    .trim()

  // User messages: right-aligned speech bubble (ChatGPT style)
  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="bg-foreground/80 dark:bg-foreground/80 rounded-2xl rounded-tr-sm px-4 py-2.5 text-white shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
          </div>
          {timestamp && (
            <div className="mt-1 flex justify-end">
              <span className="text-muted-foreground text-xs">
                {timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant messages: left-aligned with avatar
  return (
    <div className="bg-background flex gap-3 px-4 py-4">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(0,196,170,0.12)] text-[#007A68]">
        <Bot className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Foracle Assistant</span>
          {timestamp && (
            <span className="text-muted-foreground text-xs">
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
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
                <h1 className="text-foreground mt-6 mb-3 text-xl font-bold first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-foreground mt-5 mb-2 text-lg font-semibold first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-foreground mt-4 mb-2 text-base font-semibold first:mt-0">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-muted-foreground mt-3 mb-1 text-sm font-semibold">
                  {children}
                </h4>
              ),

              // Paragraphs
              p: ({ children }) => (
                <p className="text-foreground mb-3 text-sm leading-relaxed last:mb-0">
                  {children}
                </p>
              ),

              // Lists
              ul: ({ children }) => (
                <ul className="my-3 ml-4 list-none space-y-1.5 text-sm">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="counter-reset-item my-3 ml-4 list-none space-y-2 text-sm">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground flex items-start gap-2">
                  <span className="bg-foreground/50 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                  <span className="flex-1">{children}</span>
                </li>
              ),

              // Strong/Bold - with safety status color coding
              strong: ({ children }) => {
                const text = String(children).toLowerCase()

                // Green status indicators
                if (text.includes("green") || text.includes("safe")) {
                  return (
                    <strong className="font-semibold text-[#007A68] dark:text-[#007A68]">
                      {children}
                    </strong>
                  )
                }

                // Yellow/Caution status indicators
                if (text.includes("yellow") || text.includes("caution")) {
                  return (
                    <strong className="font-semibold text-[#7A5A00] dark:text-[#7A5A00]">
                      {children}
                    </strong>
                  )
                }

                // Red/At Risk status indicators
                if (text.includes("red") || text.includes("at risk")) {
                  return (
                    <strong className="font-semibold text-[#8B0000] dark:text-[#8B0000]">
                      {children}
                    </strong>
                  )
                }

                return (
                  <strong className="text-foreground font-semibold">
                    {children}
                  </strong>
                )
              },

              // Emphasis/Italic
              em: ({ children }) => <em className="italic">{children}</em>,

              // Code
              code: ({ children, className }) => {
                const isInline = !className
                if (isInline) {
                  return (
                    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                      {children}
                    </code>
                  )
                }
                return (
                  <code className={cn("font-mono text-xs", className)}>
                    {children}
                  </code>
                )
              },

              // Code blocks
              pre: ({ children }) => (
                <pre className="bg-muted my-3 overflow-x-auto rounded-lg p-3 text-xs">
                  {children}
                </pre>
              ),

              // Tables
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-lg border">
                  <table className="divide-border min-w-full divide-y text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-border divide-y">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-muted/30 transition-colors">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="text-foreground px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="text-foreground px-3 py-2 text-sm whitespace-nowrap">
                  {children}
                </td>
              ),

              // Horizontal rule
              hr: () => <hr className="border-border my-4" />,

              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="text-muted-foreground my-3 border-l-4 border-[rgba(0,196,170,0.25)] pl-4 italic">
                  {children}
                </blockquote>
              ),

              // Links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007A68] underline hover:text-[#007A68]">
                  {children}
                </a>
              )
            }}>
            {displayContent}
          </ReactMarkdown>
        </div>

        {/*
          HARD RULE: Data sources section MUST always appear when tools were used.
          This collapsible section shows which data sources (tools) were queried
          to generate the response, ensuring transparency for the user.
        */}
        {hasDataUsed && (
          <div className="bg-muted/30 mt-4 rounded-lg border">
            <button
              onClick={() => setShowDataUsed(!showDataUsed)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors">
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
                    <li
                      key={idx}
                      className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#00C4AA]" />
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                        {tool}
                      </code>
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
  )
}

// Tool descriptions for display
function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    get_income_summary: "Income and CPF details",
    get_expenses_summary: "Expense breakdown",
    get_family_summary: "Household structure",
    get_balance_summary: "Balance projections"
  }
  return descriptions[tool] || ""
}
