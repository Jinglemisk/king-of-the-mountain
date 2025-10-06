/**
 * useDragAndDrop Hook
 * Manages drag-and-drop state and handlers
 */

import { useState } from 'react';
import type { Item } from '../../../types';

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<{ item: Item; source: string } | null>(null);

  /**
   * Handle drag start event
   */
  const handleDragStart = (item: Item, source: string) => {
    setDraggedItem({ item, source });
  };

  /**
   * Handle drag over event (allow drop)
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  return {
    draggedItem,
    setDraggedItem,
    handleDragStart,
    handleDragOver,
  };
}
