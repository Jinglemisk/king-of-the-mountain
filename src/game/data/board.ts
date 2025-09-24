import { loadBoard } from '../engine/board';
import type { BoardGraphExtended } from '../engine/board';

const layoutCache = new Map<string, BoardGraphExtended>();

export function getBoardLayout(boardId: 'board.v1' = 'board.v1'): BoardGraphExtended {
  if (!layoutCache.has(boardId)) {
    layoutCache.set(boardId, loadBoard(boardId));
  }
  return layoutCache.get(boardId)!;
}
