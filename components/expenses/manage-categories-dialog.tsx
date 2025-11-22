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
  getExpenseCategories,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  type ExpenseCategory,
} from "@/lib/actions/expense-categories";

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesUpdated?: () => void;
}

export function ManageCategoriesDialog({
  open,
  onOpenChange,
  onCategoriesUpdated,
}: ManageCategoriesDialogProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    const data = await getExpenseCategories();
    setCategories(data);
  };

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;

    setIsAdding(true);
    try {
      await addExpenseCategory(newCategoryName.trim());
      setNewCategoryName("");
      await loadCategories();
      onCategoriesUpdated?.();
    } catch (error) {
      console.error("Failed to add category:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      await updateExpenseCategory(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
      await loadCategories();
      onCategoriesUpdated?.();
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpenseCategory(id);
      await loadCategories();
      onCategoriesUpdated?.();
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const startEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Expense Categories</DialogTitle>
          <DialogDescription>
            Create and organise categories for your expense sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Category */}
          <div className="border border-dashed rounded-lg p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter new category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={!newCategoryName.trim() || isAdding}
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
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories List */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Your Categories ({filteredCategories.length})
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No categories found" : "No categories yet"}
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {editingId === category.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(category.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdate(category.id)}
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
                        <span className="flex-1 font-medium">{category.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
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
