"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { UserResource } from "@clerk/types";

interface SidebarUserCardProps {
  user: UserResource | null | undefined;
  isLoaded: boolean;
  isExpanded: boolean;
}

export function SidebarUserCard({ user, isLoaded, isExpanded }: SidebarUserCardProps) {
  if (!isLoaded) {
    return (
      <div className="p-3">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl",
            isExpanded ? "justify-start" : "justify-center"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-[#2C3E3D] animate-pulse flex-shrink-0" />
          {isExpanded && (
            <div className="flex flex-col gap-1 overflow-hidden">
              <div className="h-4 w-24 bg-[#2C3E3D] animate-pulse rounded" />
              <div className="h-3 w-16 bg-[#2C3E3D] animate-pulse rounded" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const displayName = user?.firstName || user?.username || "User";
  const avatarUrl = user?.imageUrl;
  const accountType = "Personal Account";

  return (
    <div className="p-3">
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-md bg-[rgba(240,235,224,0.05)] transition-all duration-300",
          isExpanded ? "justify-start" : "justify-center"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#B8622A] flex items-center justify-center font-display text-[#FBF7F1] font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name and subtitle - only visible when expanded */}
        <div
          className={cn(
            "flex flex-col min-w-0 transition-all duration-300",
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
          )}
        >
          <span className="font-display font-semibold text-sm text-[#F0EBE0] truncate">
            {displayName}
          </span>
          <span className="text-xs text-[rgba(240,235,224,0.45)] truncate">
            {accountType}
          </span>
        </div>
      </div>
    </div>
  );
}
