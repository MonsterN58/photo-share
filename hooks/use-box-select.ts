"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BoxSelectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseBoxSelectOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  itemSelector: string;
  idAttribute: string;
  onSelectionChange: (ids: string[]) => void;
  enabled?: boolean;
}

export function useBoxSelect({
  containerRef,
  itemSelector,
  idAttribute,
  onSelectionChange,
  enabled = true,
}: UseBoxSelectOptions) {
  const [selectionRect, setSelectionRect] = useState<BoxSelectRect | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isSelecting = useRef(false);

  const getIntersectingIds = useCallback(
    (rect: BoxSelectRect): string[] => {
      const container = containerRef.current;
      if (!container) return [];

      const items = container.querySelectorAll(itemSelector);
      const ids: string[] = [];
      const containerRect = container.getBoundingClientRect();

      // Convert rect to page coordinates relative to viewport
      const selBox = {
        left: rect.x + containerRect.left,
        top: rect.y + containerRect.top,
        right: rect.x + rect.width + containerRect.left,
        bottom: rect.y + rect.height + containerRect.top,
      };

      items.forEach((item) => {
        const id = item.getAttribute(idAttribute);
        if (!id) return;

        const itemRect = item.getBoundingClientRect();
        // Check if item intersects with selection box
        if (
          itemRect.left < selBox.right &&
          itemRect.right > selBox.left &&
          itemRect.top < selBox.bottom &&
          itemRect.bottom > selBox.top
        ) {
          ids.push(id);
        }
      });

      return ids;
    },
    [containerRef, itemSelector, idAttribute]
  );

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only left click, and not on interactive elements
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("[draggable=true]") ||
        target.closest("[role=button]")
      ) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      startPos.current = {
        x: e.clientX - containerRect.left + container.scrollLeft,
        y: e.clientY - containerRect.top + container.scrollTop,
      };
      isSelecting.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!startPos.current) return;

      const containerRect = container.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left + container.scrollLeft;
      const currentY = e.clientY - containerRect.top + container.scrollTop;

      const dx = currentX - startPos.current.x;
      const dy = currentY - startPos.current.y;

      // Only start selection after a small threshold to avoid accidental selections
      if (!isSelecting.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

      isSelecting.current = true;
      e.preventDefault();

      const rect: BoxSelectRect = {
        x: Math.min(startPos.current.x, currentX),
        y: Math.min(startPos.current.y, currentY),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };

      setSelectionRect(rect);
      const ids = getIntersectingIds(rect);
      onSelectionChange(ids);
    };

    const handleMouseUp = () => {
      startPos.current = null;
      isSelecting.current = false;
      setSelectionRect(null);
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [enabled, containerRef, getIntersectingIds, onSelectionChange]);

  return { selectionRect };
}
