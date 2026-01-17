"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableExpenseRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  isOpen: boolean;
  onSwipeStart: () => void;
}

export function SwipeableExpenseRow({
  children,
  onDelete,
  isOpen,
  onSwipeStart
}: SwipeableExpenseRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const DELETE_BUTTON_WIDTH = 80;

  // Sync with external isOpen state
  useEffect(() => {
    if (!isOpen && translateX !== 0) {
      setTranslateX(0);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
    // Notify parent that this row is being swiped
    onSwipeStart();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const diff = e.touches[0].clientX - startXRef.current;
    const newTranslate = currentXRef.current + diff;

    // Only allow swiping left (negative values) and limit the swipe distance
    if (newTranslate <= 0 && newTranslate >= -DELETE_BUTTON_WIDTH) {
      setTranslateX(newTranslate);
    } else if (newTranslate > 0) {
      setTranslateX(0);
    } else if (newTranslate < -DELETE_BUTTON_WIDTH) {
      setTranslateX(-DELETE_BUTTON_WIDTH);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to either open or closed position
    if (translateX < -DELETE_BUTTON_WIDTH / 2) {
      setTranslateX(-DELETE_BUTTON_WIDTH);
    } else {
      setTranslateX(0);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Reset position first, then trigger delete
    setTranslateX(0);
    onDelete();
  };

  const closeSwipe = () => {
    setTranslateX(0);
  };

  const isRevealed = translateX < 0;

  return (
    <div className="relative overflow-hidden">
      {/* Swipeable content - full width with delete button inside */}
      <div
        className={cn(
          "relative flex",
          isDragging ? "" : "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main content */}
        <div
          className="w-full flex-shrink-0 bg-background"
          onClick={isRevealed ? closeSwipe : undefined}
        >
          {children}
        </div>

        {/* Delete button - positioned right after content */}
        <div
          className="w-20 flex-shrink-0 bg-red-500 flex items-center justify-center cursor-pointer"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
