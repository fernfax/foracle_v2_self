"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2, Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
  type InsuranceProvider,
} from "@/lib/actions/insurance-providers";

interface ProviderManagerPopoverProps {
  providers: InsuranceProvider[];
  onProvidersChanged: () => Promise<void>;
}

export function ProviderManagerPopover({
  providers,
  onProvidersChanged,
}: ProviderManagerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newProviderName.trim()) return;

    setIsAdding(true);
    try {
      await addInsuranceProvider(newProviderName.trim());
      setNewProviderName("");
      await onProvidersChanged();
    } catch (error) {
      console.error("Failed to add provider:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      await updateInsuranceProvider(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
      await onProvidersChanged();
    } catch (error) {
      console.error("Failed to update provider:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInsuranceProvider(id);
      await onProvidersChanged();
    } catch (error) {
      console.error("Failed to delete provider:", error);
    }
  };

  const startEdit = (provider: InsuranceProvider) => {
    setEditingId(provider.id);
    setEditingName(provider.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
          <Settings2 className="h-3 w-3 mr-1" />
          Manage Providers
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-sm">Manage Providers</h4>
            <p className="text-xs text-muted-foreground">Add, edit, or delete insurance providers</p>
          </div>

          {/* Add New Provider */}
          <div className="border border-dashed rounded-lg p-3">
            <div className="flex gap-2">
              <Input
                placeholder="New provider name..."
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="flex-1 h-8 text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={!newProviderName.trim() || isAdding}
                size="sm"
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Providers List */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Your Providers ({providers.length})
            </div>
          </div>
        </div>

        {/* Scrollable area outside padding */}
        <div className="px-4 pb-4">
          <div
            className="overflow-y-auto border rounded-md p-2 bg-muted/20"
            style={{
              maxHeight: '300px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9'
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
              {providers.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No providers yet
                </div>
              ) : (
                providers.map((provider, index) => (
                  <div
                    key={provider.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors",
                      index > 0 && "mt-2"
                    )}
                  >
                    {editingId === provider.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(provider.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdate(provider.id)}
                          disabled={!editingName.trim()}
                          className="h-7 px-2"
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{provider.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(provider)}
                          className="h-7 px-2"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(provider.id)}
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
