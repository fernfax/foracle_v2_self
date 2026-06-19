"use client"

import { useState } from "react"
import type { ExpenseSubcategory } from "@/actions/expense-subcategories"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"

import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

interface SubcategoryManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryName: string
  subcategories: ExpenseSubcategory[]
  selectedSubcategory: ExpenseSubcategory | null
  onSelect: (subcategory: ExpenseSubcategory | null) => void
  onAdd: (name: string) => Promise<ExpenseSubcategory>
  onEdit: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function BudgetSubcategoryManageModal({
  open,
  onOpenChange,
  categoryName,
  subcategories,
  selectedSubcategory,
  onSelect,
  onAdd,
  onEdit,
  onDelete
}: SubcategoryManageModalProps) {
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newSub = await onAdd(newName.trim())
      onSelect(newSub)
      setNewName("")
    } catch (error) {
      console.error("Error adding subcategory:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingId || !editingName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onEdit(editingId, editingName.trim())
      setEditingId(null)
      setEditingName("")
    } catch (error) {
      console.error("Error editing subcategory:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onDelete(id)
      if (selectedSubcategory?.id === id) {
        onSelect(null)
      }
    } catch (error) {
      console.error("Error deleting subcategory:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (subcategory: ExpenseSubcategory) => {
    setEditingId(subcategory.id)
    setEditingName(subcategory.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName("")
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: "add" | "edit") => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (action === "add") {
        handleAdd()
      } else {
        handleEdit()
      }
    } else if (e.key === "Escape") {
      if (action === "edit") {
        cancelEditing()
      }
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 touch-manipulation">
              <X className="size-4" />
            </Button>
          </DrawerClose>
          <DrawerTitle className="flex-1 text-center text-lg font-semibold">
            {categoryName} Subcategories
          </DrawerTitle>
          <div className="w-8" />
        </DrawerHeader>

        <DrawerBody>
          {/* Add new subcategory */}
          <div className="relative z-10 mt-2 mb-6 flex items-center gap-2">
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "add")}
              placeholder="Add new subcategory..."
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting || !newName.trim()}
              className="min-h-[44px] min-w-[70px] touch-manipulation">
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>

          {/* Subcategory list */}
          {subcategories.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>No subcategories yet.</p>
              <p className="mt-1 text-sm">Add one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subcategories.map((subcategory) => {
                const isEditing = editingId === subcategory.id
                const isSelected = selectedSubcategory?.id === subcategory.id

                if (isEditing) {
                  return (
                    <div
                      key={subcategory.id}
                      className="bg-muted/30 flex items-center gap-2 rounded-lg border p-3">
                      <Input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "edit")}
                        className="flex-1"
                        autoFocus
                        disabled={isSubmitting}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 touch-manipulation"
                        onClick={handleEdit}
                        disabled={isSubmitting || !editingName.trim()}>
                        <Check className="text-on-success size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 touch-manipulation"
                        onClick={cancelEditing}
                        disabled={isSubmitting}>
                        <X className="text-muted-foreground size-4" />
                      </Button>
                    </div>
                  )
                }

                return (
                  <div
                    key={subcategory.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all",
                      isSelected
                        ? "border-brand-terracotta/[0.25] bg-brand-terracotta/[0.1]"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => {
                      onSelect(subcategory)
                      onOpenChange(false)
                    }}>
                    <span className="text-foreground flex-1 font-medium">
                      {subcategory.name}
                    </span>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditing(subcategory)
                      }}
                      disabled={isSubmitting}>
                      <Pencil className="text-muted-foreground size-4" />
                    </Button>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(subcategory.id)
                      }}
                      disabled={isSubmitting}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
