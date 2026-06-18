"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface TabItem {
  value: string
  label: string
  icon?: LucideIcon
  dataTour?: string
  badge?: number
  badgeVariant?: "default" | "success"
}

interface SlidingTabsProps {
  tabs: TabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function SlidingTabs({
  tabs,
  value,
  onValueChange,
  className
}: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const activeTab = tabRefs.current.get(value)
    const container = containerRef.current

    if (activeTab && container) {
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()

      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width
      })
    }
  }, [value])

  useEffect(() => {
    updateIndicator()
  }, [value, updateIndicator])

  useEffect(() => {
    // Update on resize
    window.addEventListener("resize", updateIndicator)
    // Small delay to ensure fonts are loaded
    const timer = setTimeout(updateIndicator, 100)

    return () => {
      window.removeEventListener("resize", updateIndicator)
      clearTimeout(timer)
    }
  }, [updateIndicator])

  const setTabRef = (value: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(value, el)
    } else {
      tabRefs.current.delete(value)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center gap-0.5",
        "scrollbar-hide max-w-full overflow-x-auto",
        className
      )}>
      {/* Sliding underline indicator */}
      <div
        className="bg-brand-terracotta absolute bottom-0 h-[2px] rounded-full transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width
        }}
      />

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = value === tab.value
        const Icon = tab.icon

        return (
          <button
            key={tab.value}
            ref={setTabRef(tab.value)}
            onClick={() => onValueChange(tab.value)}
            data-tour={tab.dataTour}
            className={cn(
              "font-display relative z-10 flex items-center gap-1.5 px-3 pt-1 pb-2 text-[13px] font-medium transition-colors duration-200",
              "md:gap-2 md:px-4",
              isActive
                ? "text-brand-terracotta"
                : "text-muted-foreground hover:text-foreground"
            )}>
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-xs",
                  isActive
                    ? "bg-brand-terracotta/15 text-brand-terracotta"
                    : tab.badgeVariant === "success"
                      ? "text-on-success bg-brand-teal/[0.15]"
                      : "bg-primary/10 text-primary"
                )}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
