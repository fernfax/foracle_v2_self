"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function ClerkUserButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  return <UserButton afterSignOutUrl="/" />;
}
