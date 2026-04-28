"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  dataTour?: string;
  badge?: number;
  badgeVariant?: "default" | "success";
}

interface SlidingTabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SlidingTabs({
  tabs,
  value,
  onValueChange,
  className,
}: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const activeTab = tabRefs.current.get(value);
    const container = containerRef.current;

    if (activeTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [value]);

  useEffect(() => {
    updateIndicator();
  }, [value, updateIndicator]);

  useEffect(() => {
    // Update on resize
    window.addEventListener("resize", updateIndicator);
    // Small delay to ensure fonts are loaded
    const timer = setTimeout(updateIndicator, 100);

    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timer);
    };
  }, [updateIndicator]);

  const setTabRef = (value: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(value, el);
    } else {
      tabRefs.current.delete(value);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center gap-1 p-1.5 rounded-full bg-muted/70 border border-border/40",
        // Mobile: allow horizontal scroll within container, hide scrollbar
        "max-w-full overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-full bg-primary shadow-sm shadow-primary/20 transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            ref={setTabRef(tab.value)}
            onClick={() => onValueChange(tab.value)}
            data-tour={tab.dataTour}
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-full font-display text-[13px] font-medium transition-colors duration-200",
              // Larger padding on desktop
              "md:gap-2 md:px-5 md:py-2.5",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  "ml-1 text-xs px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.badgeVariant === "success"
                    ? "bg-[rgba(0,196,170,0.15)] text-[#007A68]"
                    : "bg-primary/10 text-primary"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
