"use client"

import type { ElementType, ReactNode } from "react"

import { useReveal } from "@/lib/use-reveal"

/**
 * Thin client wrapper that applies the scroll-reveal (fade + rise on enter).
 * Lets `app/page.tsx` stay a server component — only this wrapper is client;
 * its children render on the server. Pass `delay` (ms) to stagger siblings.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div"
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: ElementType
}) {
  const ref = useReveal<HTMLElement>()
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}
