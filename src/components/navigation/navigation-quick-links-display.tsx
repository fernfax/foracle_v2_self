"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { QuickLink } from "@/actions/quick-links"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Building,
  DollarSign,
  GripVertical,
  Home,
  PieChart,
  Plus,
  Receipt,
  Settings2,
  Shield,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet
} from "lucide-react"

import { Button } from "@/components/ui/button"

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
  PieChart
}

interface SortableQuickLinkProps {
  link: QuickLink
  onNavigate: (href: string) => void
}

function SortableQuickLink({ link, onNavigate }: SortableQuickLinkProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0
  }

  const Icon = ICON_MAP[link.icon]

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onNavigate(link.href)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center ${isDragging ? "opacity-50" : ""}`}>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
        <GripVertical className="text-muted-foreground h-3 w-3" />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-border/30 text-foreground/70 hover:bg-muted/70 hover:border-border/60 hover:text-foreground h-8 rounded-full bg-transparent px-3.5 text-[13px] font-medium transition-all duration-200 dark:hover:bg-white/10"
        onClick={handleClick}>
        {Icon && <Icon className="mr-1.5 h-4 w-4" />}
        {link.label}
      </Button>
    </div>
  )
}

interface QuickLinksDisplayProps {
  links: QuickLink[]
  onReorder: (links: QuickLink[]) => void
  onEditClick: () => void
}

export function NavigationQuickLinksDisplay({
  links,
  onReorder,
  onEditClick
}: QuickLinksDisplayProps) {
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const linkIds = useMemo(() => links.map((link) => link.id), [links])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id)
      const newIndex = links.findIndex((link) => link.id === over.id)

      const newLinks = arrayMove(links, oldIndex, newIndex).map(
        (link, index) => ({
          ...link,
          sortOrder: index
        })
      )

      onReorder(newLinks)
    }
  }

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  return (
    <div className="flex items-center gap-1">
      {links.length > 0 ? (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}>
            <SortableContext
              items={linkIds}
              strategy={horizontalListSortingStrategy}>
              <div className="flex items-center gap-0.5">
                {links.map((link) => (
                  <SortableQuickLink
                    key={link.id}
                    link={link}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            className="ml-1 h-8 px-2"
            title="Edit Quick Links">
            <Settings2 className="h-4 w-4" />
          </Button>
        </>
      ) : (
        // Empty state is an actionable affordance, not persistent happy-talk:
        // one subtle ghost button that opens the same edit flow.
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditClick}
          className="text-muted-foreground hover:text-foreground h-8 px-2"
          title="Add quick links">
          <Plus className="mr-1 h-4 w-4" />
          Add quick link
        </Button>
      )}
    </div>
  )
}
