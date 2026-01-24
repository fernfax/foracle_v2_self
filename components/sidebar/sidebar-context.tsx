"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isPinned: boolean;
  setIsPinned: (value: boolean) => void;
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
  isExpanded: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is expanded if pinned OR if hovered (when not pinned)
  const isExpanded = isPinned || isHovered;

  return (
    <SidebarContext.Provider
      value={{
        isPinned,
        setIsPinned,
        isHovered,
        setIsHovered,
        isExpanded,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
