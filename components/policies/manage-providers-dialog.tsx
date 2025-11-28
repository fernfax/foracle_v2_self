"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Pencil, X } from "lucide-react";
import {
  getInsuranceProviders,
  addInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
  type InsuranceProvider,
} from "@/lib/actions/insurance-providers";

interface ManageProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProvidersUpdated?: () => void;
}

export function ManageProvidersDialog({
  open,
  onOpenChange,
  onProvidersUpdated,
}: ManageProvidersDialogProps) {
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [newProviderName, setNewProviderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    const data = await getInsuranceProviders();
    setProviders(data);
  };

  const handleAdd = async () => {
    if (!newProviderName.trim()) return;

    setIsAdding(true);
    try {
      await addInsuranceProvider(newProviderName.trim());
      setNewProviderName("");
      await loadProviders();
      onProvidersUpdated?.();
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
      await loadProviders();
      onProvidersUpdated?.();
    } catch (error) {
      console.error("Failed to update provider:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInsuranceProvider(id);
      await loadProviders();
      onProvidersUpdated?.();
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

  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Insurance Providers</DialogTitle>
          <DialogDescription>
            Create and organise providers for your insurance policies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Provider */}
          <div className="border border-dashed rounded-lg p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter new provider name..."
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={!newProviderName.trim() || isAdding}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Providers List */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Your Providers ({filteredProviders.length})
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredProviders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No providers found" : "No providers yet"}
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
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
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdate(provider.id)}
                          disabled={!editingName.trim()}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{provider.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(provider)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(provider.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
