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
        // Hide on desktop
        "md:hidden",
        // Mobile positioning - above help button (which is at bottom-24)
        "bottom-36 right-6"
      )}
      onClick={handleClick}
      aria-label="Add expense"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
