"use client"

import { useEffect, useState } from "react"
import {
  addExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  getExpensesByCategory,
  updateExpenseCategory,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { AlertTriangle, Pencil, Plus, Search, Trash2, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ManageCategoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoriesUpdated?: () => void
}

export function ManageCategoriesDialog({
  open,
  onOpenChange,
  onCategoriesUpdated
}: ManageCategoriesDialogProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] =
    useState<ExpenseCategory | null>(null)
  const [linkedExpenses, setLinkedExpenses] = useState<
    { id: string; name: string; amount: string }[]
  >([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)

  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  const loadCategories = async () => {
    const data = await getExpenseCategories()
    setCategories(data)
  }

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return

    setIsAdding(true)
    try {
      await addExpenseCategory(newCategoryName.trim())
      setNewCategoryName("")
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error) {
      console.error("Failed to add category:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return

    try {
      await updateExpenseCategory(id, editingName.trim())
      setEditingId(null)
      setEditingName("")
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error) {
      console.error("Failed to update category:", error)
    }
  }

  const handleDeleteClick = async (category: ExpenseCategory) => {
    setCategoryToDelete(category)
    setIsLoadingExpenses(true)
    setDeleteDialogOpen(true)

    try {
      const expenses = await getExpensesByCategory(category.name)
      setLinkedExpenses(expenses)
    } catch (error) {
      console.error("Failed to fetch linked expenses:", error)
      setLinkedExpenses([])
    } finally {
      setIsLoadingExpenses(false)
    }
  }

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!categoryToDelete || linkedExpenses.length > 0) return

    try {
      await deleteExpenseCategory(categoryToDelete.id)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      setLinkedExpenses([])
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error) {
      console.error("Failed to delete category:", error)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      setLinkedExpenses([])
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setCategoryToDelete(null)
    setLinkedExpenses([])
  }

  const startEdit = (category: ExpenseCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Expense Categories</DialogTitle>
            <DialogDescription>
              Create and organise categories for your expense sources.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Category */}
            <div className="rounded-lg border border-dashed p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd()
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newCategoryName.trim() || isAdding}
                  size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Categories List */}
            <div>
              <div className="text-muted-foreground mb-2 text-sm">
                Your Categories ({filteredCategories.length})
              </div>
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filteredCategories.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    {searchQuery ? "No categories found" : "No categories yet"}
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="bg-card hover:bg-accent/50 flex items-center gap-2 rounded-lg border p-3 transition-colors">
                      {editingId === category.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate(category.id)
                              if (e.key === "Escape") cancelEdit()
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdate(category.id)}
                            disabled={!editingName.trim()}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">
                            {category.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(category)}
                            className="text-on-danger hover:text-on-danger hover:bg-[rgba(224,85,85,0.12)]">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkedExpenses.length > 0 ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="text-on-warning h-5 w-5" />
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
                  This category has <strong>{linkedExpenses.length}</strong>{" "}
                  expense{linkedExpenses.length > 1 ? "s" : ""} linked to it.
                  Please reassign or delete these expenses before removing the
                  category.
                </span>
              ) : (
                `Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show linked expenses if any */}
          {!isLoadingExpenses && linkedExpenses.length > 0 && (
            <div className="my-4">
              <div className="mb-2 text-sm font-medium">Linked Expenses:</div>
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {linkedExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-muted flex items-center justify-between rounded-md p-2 text-sm">
                    <span className="mr-2 flex-1 truncate font-medium">
                      {expense.name}
                    </span>
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
                className="bg-[#E05555] hover:bg-[#E05555]">
                Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
