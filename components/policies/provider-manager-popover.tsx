"use client"

import { useState } from "react"
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react"

import {
  addInsuranceProvider,
  deleteInsuranceProvider,
  updateInsuranceProvider,
  type InsuranceProvider
} from "@/lib/actions/insurance-providers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

interface ProviderManagerPopoverProps {
  providers: InsuranceProvider[]
  onProvidersChanged: () => Promise<void>
}

export function ProviderManagerPopover({
  providers,
  onProvidersChanged
}: ProviderManagerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [newProviderName, setNewProviderName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newProviderName.trim()) return

    setIsAdding(true)
    try {
      await addInsuranceProvider(newProviderName.trim())
      setNewProviderName("")
      await onProvidersChanged()
    } catch (error) {
      console.error("Failed to add provider:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return

    try {
      await updateInsuranceProvider(id, editingName.trim())
      setEditingId(null)
      setEditingName("")
      await onProvidersChanged()
    } catch (error) {
      console.error("Failed to update provider:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteInsuranceProvider(id)
      await onProvidersChanged()
    } catch (error) {
      console.error("Failed to delete provider:", error)
    }
  }

  const startEdit = (provider: InsuranceProvider) => {
    setEditingId(provider.id)
    setEditingName(provider.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs">
          <Settings2 className="mr-1 h-3 w-3" />
          Manage Providers
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Header */}
          <div>
            <h4 className="text-sm font-semibold">Manage Providers</h4>
            <p className="text-muted-foreground text-xs">
              Add, edit, or delete insurance providers
            </p>
          </div>

          {/* Add New Provider */}
          <div className="rounded-lg border border-dashed p-3">
            <div className="flex gap-2">
              <Input
                placeholder="New provider name..."
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
                className="h-8 flex-1 text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={!newProviderName.trim() || isAdding}
                size="sm"
                className="h-8">
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          </div>

          {/* Providers List */}
          <div>
            <div className="text-muted-foreground mb-2 text-xs">
              Your Providers ({providers.length})
            </div>
          </div>
        </div>

        {/* Scrollable area outside padding */}
        <div className="px-4 pb-4">
          <div
            className="bg-muted/20 overflow-y-auto rounded-md border p-2"
            style={{
              maxHeight: "300px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(28,43,42,0.35) #F0EBE0"
            }}
            onWheel={(e) => {
              e.stopPropagation()
            }}>
            {providers.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-xs">
                No providers yet
              </div>
            ) : (
              providers.map((provider, index) => (
                <div
                  key={provider.id}
                  className={cn(
                    "bg-card hover:bg-accent/50 flex items-center gap-2 rounded-md border p-2 transition-colors",
                    index > 0 && "mt-2"
                  )}>
                  {editingId === provider.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(provider.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        className="h-7 flex-1 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdate(provider.id)}
                        disabled={!editingName.trim()}
                        className="h-7 px-2">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 px-2">
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {provider.name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(provider)}
                        className="h-7 px-2">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(provider.id)}
                        className="h-7 px-2 text-[#8B0000] hover:bg-[rgba(224,85,85,0.12)] hover:text-[#8B0000]">
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
  )
}
