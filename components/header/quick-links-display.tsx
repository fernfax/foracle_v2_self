"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Settings2, GripVertical } from "lucide-react";
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
import type { QuickLink } from "@/lib/actions/quick-links";

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

interface SortableQuickLinkProps {
  link: QuickLink;
  onNavigate: (href: string) => void;
}

function SortableQuickLink({ link, onNavigate }: SortableQuickLinkProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  const Icon = ICON_MAP[link.icon];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(link.href);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
        onClick={handleClick}
      >
        {Icon && <Icon className="h-4 w-4 mr-1.5" />}
        {link.label}
      </Button>
    </div>
  );
}

interface QuickLinksDisplayProps {
  links: QuickLink[];
  onReorder: (links: QuickLink[]) => void;
  onEditClick: () => void;
}

export function QuickLinksDisplay({
  links,
  onReorder,
  onEditClick,
}: QuickLinksDisplayProps) {
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const linkIds = useMemo(() => links.map((link) => link.id), [links]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over.id);

      const newLinks = arrayMove(links, oldIndex, newIndex).map(
        (link, index) => ({
          ...link,
          sortOrder: index,
        })
      );

      onReorder(newLinks);
    }
  };

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex items-center gap-1">
      {links.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={linkIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-center gap-0.5">
              {links.map((link) => (
                <SortableQuickLink key={link.id} link={link} onNavigate={handleNavigate} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <span className="text-sm text-muted-foreground px-2">
          No quick links yet
        </span>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onEditClick}
        className="h-8 px-2 ml-1"
        title="Edit Quick Links"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
