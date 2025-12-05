"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  QUICK_LINK_OPTIONS,
  MAX_QUICK_LINKS,
  CATEGORY_LABELS,
  type QuickLinkOption,
} from "@/lib/quick-links-config";
import {
  Home,
  User,
  Wallet,
  TrendingUp,
  Shield,
  Target,
  Users,
  DollarSign,
  Building,
  Receipt,
  PieChart,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  User,
  Wallet,
  TrendingUp,
  Shield,
  Target,
  Users,
  DollarSign,
  Building,
  Receipt,
  PieChart,
};

interface QuickLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKeys: string[];
  onSave: (selectedKeys: string[]) => void;
  isSaving?: boolean;
}

export function QuickLinksModal({
  open,
  onOpenChange,
  selectedKeys,
  onSave,
  isSaving = false,
}: QuickLinksModalProps) {
  const [localSelectedKeys, setLocalSelectedKeys] = useState<string[]>(selectedKeys);

  // Reset local state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalSelectedKeys(selectedKeys);
    }
    onOpenChange(newOpen);
  };

  const handleToggle = (key: string) => {
    setLocalSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_QUICK_LINKS) {
        return prev; // Don't add if at max
      }
      return [...prev, key];
    });
  };

  const handleSave = () => {
    onSave(localSelectedKeys);
  };

  const isAtMax = localSelectedKeys.length >= MAX_QUICK_LINKS;

  const renderCategory = (category: QuickLinkOption["category"]) => {
    const options = QUICK_LINK_OPTIONS.filter((o) => o.category === category);
    return (
      <div key={category} className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          {CATEGORY_LABELS[category]}
        </h4>
        <div className="space-y-2">
          {options.map((option) => {
            const Icon = ICON_MAP[option.icon];
            const isSelected = localSelectedKeys.includes(option.key);
            const isDisabled = !isSelected && isAtMax;

            return (
              <div
                key={option.key}
                className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                  isSelected
                    ? "bg-primary/5"
                    : isDisabled
                    ? "opacity-50"
                    : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  id={option.key}
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(option.key)}
                  disabled={isDisabled}
                />
                <Label
                  htmlFor={option.key}
                  className={`flex items-center gap-2 cursor-pointer flex-1 ${
                    isDisabled ? "cursor-not-allowed" : ""
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">{option.label}</span>
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Quick Links</DialogTitle>
          <DialogDescription>
            Select up to {MAX_QUICK_LINKS} shortcuts ({localSelectedKeys.length}/{MAX_QUICK_LINKS})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {renderCategory("main")}
          {renderCategory("user-tabs")}
          {renderCategory("expenses-tabs")}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
