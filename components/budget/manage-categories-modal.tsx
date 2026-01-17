"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultCategoryIcon, getCategoryIconColor, getCategoryBgColor } from "@/lib/budget-utils";
import { updateTrackedCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import * as LucideIcons from "lucide-react";

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  onSuccess?: () => void;
}

// Helper to get Lucide icon component by name
function getIconComponent(iconName: string | null, categoryName: string) {
  const name = iconName || getDefaultCategoryIcon(categoryName);
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[pascalCase];
  return IconComponent || LucideIcons.CircleDollarSign;
}

export function ManageCategoriesModal({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: ManageCategoriesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected categories when modal opens
  useEffect(() => {
    if (open) {
      const tracked = new Set(
        categories
          .filter((c) => c.trackedInBudget !== false)
          .map((c) => c.id)
      );
      setSelectedIds(tracked);
    }
  }, [open, categories]);

  const handleToggle = (categoryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTrackedCategories(Array.from(selectedIds));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating tracked categories:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {/* Header */}
        <DrawerHeader>
          <DrawerTitle className="flex-1 text-lg font-semibold">
            Manage Categories
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <DrawerBody>
          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            Select categories to track on your dashboard
          </p>

          {/* Category List */}
          <div className="space-y-2">
            {categories.map((category) => {
              const isSelected = selectedIds.has(category.id);
              const Icon = getIconComponent(category.icon, category.name);
              const iconColor = getCategoryIconColor(category.name);
              const bgColor = getCategoryBgColor(category.name);

              return (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/30 hover:bg-muted/50"
                  )}
                  onClick={() => handleToggle(category.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(category.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bgColor)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </DrawerBody>

        {/* Footer with buttons */}
        <DrawerFooter>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
