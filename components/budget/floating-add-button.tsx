"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAddExpense } from "./add-expense-context";

export function FloatingAddButton() {
  const pathname = usePathname();
  const { openModal } = useAddExpense();
  const isBudgetPage = pathname === "/budget";
  const isAssistantPage = pathname === "/assistant";

  const handleClick = () => {
    openModal();
  };

  // Don't render on budget page (it has its own button) or assistant page
  if (isBudgetPage || isAssistantPage) {
    return null;
  }

  return (
    <Button
      size="icon"
      variant="outline"
      className={cn(
        // Base styles - match help button styling
        "fixed z-40 rounded-full shadow-lg bg-background/95 backdrop-blur-sm hover:bg-accent",
        // Hide on desktop (width+height variant — phone-landscape keeps it,
        // matching the shell's isDesktop check that drives the bottom nav)
        "desktop:hidden",
        // Mobile positioning - above help button; both clear the bottom nav's
        // safe-area growth on notched devices (env() is 0 elsewhere)
        "bottom-[calc(9rem+env(safe-area-inset-bottom))] right-6"
      )}
      onClick={handleClick}
      aria-label="Add expense"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
