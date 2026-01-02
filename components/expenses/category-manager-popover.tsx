"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings2, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpensesByCategory,
  type ExpenseCategory,
} from "@/lib/actions/expense-categories";

interface CategoryManagerPopoverProps {
  categories: ExpenseCategory[];
  onCategoriesChanged: () => Promise<void>;
}

export function CategoryManagerPopover({
  categories,
  onCategoriesChanged,
}: CategoryManagerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [linkedExpenses, setLinkedExpenses] = useState<{ id: string; name: string; amount: string }[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;

    setIsAdding(true);
    try {
      await addExpenseCategory(newCategoryName.trim());
      setNewCategoryName("");
      await onCategoriesChanged();
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
      await onCategoriesChanged();
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  const handleDeleteClick = async (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setIsLoadingExpenses(true);
    setDeleteDialogOpen(true);

    try {
      const expenses = await getExpensesByCategory(category.name);
      setLinkedExpenses(expenses);
    } catch (error) {
      console.error("Failed to fetch linked expenses:", error);
      setLinkedExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!categoryToDelete || linkedExpenses.length > 0) return;

    try {
      await deleteExpenseCategory(categoryToDelete.id);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      setLinkedExpenses([]);
      await onCategoriesChanged();
      // Keep the popover open after deletion
      setTimeout(() => setOpen(true), 0);
    } catch (error) {
      console.error("Failed to delete category:", error);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      setLinkedExpenses([]);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
    setLinkedExpenses([]);
    // Keep the popover open after closing the dialog
    setTimeout(() => setOpen(true), 0);
  };

  const startEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
          <Settings2 className="h-3 w-3 mr-1" />
          Manage Categories
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-sm">Manage Categories</h4>
            <p className="text-xs text-muted-foreground">Add, edit, or delete expense categories</p>
          </div>

          {/* Add New Category */}
          <div className="border border-dashed rounded-lg p-3">
            <div className="flex gap-2">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="flex-1 h-8 text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={!newCategoryName.trim() || isAdding}
                size="sm"
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Your Categories ({categories.length})
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
              {categories.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No categories yet
                </div>
              ) : (
                categories.map((category, index) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors",
                      index > 0 && "mt-2"
                    )}
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
                          className="flex-1 h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdate(category.id)}
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
                        <span className="flex-1 text-sm font-medium">{category.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(category)}
                          className="h-7 px-2"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(category)}
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && handleDeleteCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {linkedExpenses.length > 0 ? (
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cannot Delete Category
              </span>
            ) : (
              "Delete Category"
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLoadingExpenses ? (
              "Checking for linked expenses..."
            ) : linkedExpenses.length > 0 ? (
              <span>
                This category has <strong>{linkedExpenses.length}</strong> expense{linkedExpenses.length > 1 ? "s" : ""} linked to it.
                Please reassign or delete these expenses before removing the category.
              </span>
            ) : (
              `Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Show linked expenses if any */}
        {!isLoadingExpenses && linkedExpenses.length > 0 && (
          <div className="my-4">
            <div className="text-sm font-medium mb-2">Linked Expenses:</div>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {linkedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted text-sm"
                >
                  <span className="font-medium truncate flex-1 mr-2">{expense.name}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    ${parseFloat(expense.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDeleteCancel}>
            {linkedExpenses.length > 0 ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {linkedExpenses.length === 0 && !isLoadingExpenses && (
            <Button
              type="button"
              onClick={(e) => handleDeleteConfirm(e)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
