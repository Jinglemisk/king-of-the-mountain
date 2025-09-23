// /src/game/engine/movement.ts
// Movement system implementation

import { NodeId, PlayerId, TileType } from '../types';
import { EngineState } from './types';
import { BoardGraphExtended, getPredecessors, getTileNode, isValidPath } from './board';

export type MoveStyle = 'step' | 'teleport' | 'mass';
export type MoveDirection = 'forward' | 'backward' | 'none';

export interface MoveContext {
  actorUid: PlayerId;      // who initiated the effect
  targetUid: PlayerId;     // who is moving
  moveStyle: MoveStyle;
  direction: MoveDirection;
  allowPassOverTriggers: boolean;
  allowDuels: boolean;
  allowLamp: boolean;      // usually only true for active player's Step 4
  simGroupId?: string;     // for simultaneous arrival sets (e.g., Earthquake)
  source: 'turnMove' | 'sleep' | 'retreat' | 'cardSelf' | 'cardOther' | 'massEffect' | 'uiBranch';
}

export interface MovementStep {
  from: NodeId;
  to: NodeId;
  onStepEnterFired: boolean;
}

export interface MovementResult {
  path: MovementStep[];         // steps taken in order
  stoppedOn: NodeId;           // final tile
  reason: 'stepsConsumed' | 'blocked' | 'final' | 'cancelled';
  pendingTile: boolean;        // whether tile resolution is deferred (external movement)
  simGroupId?: string;
  historyAfter?: NodeId[];    // updated MovementHistory for target
}

export interface BranchChoice {
  currentTileId: NodeId;
  options: NodeId[];
  remainingSteps: number;
}

export function computeMovementSteps(
  board: BoardGraphExtended,
  start: NodeId,
  steps: number,
  ctx: MoveContext,
  movementHistory: NodeId[]
): MovementResult {
  const path: MovementStep[] = [];
  let currentPos = start;
  let remainingSteps = steps;
  const newHistory = [...movementHistory];

  // Handle different movement styles
  if (ctx.moveStyle === 'teleport') {
    // Direct jump, no intermediate steps
    // For Phase 1, we'll implement basic teleport logic
    return {
      path: [{
        from: start,
        to: start, // Placeholder - actual teleport target would be passed
        onStepEnterFired: false
      }],
      stoppedOn: start,
      reason: 'stepsConsumed',
      pendingTile: ctx.targetUid !== ctx.actorUid,
      simGroupId: ctx.simGroupId,
      historyAfter: newHistory
    };
  }

  // Step-based movement
  if (ctx.direction === 'forward') {
    while (remainingSteps > 0) {
      const currentNode = getTileNode(board, currentPos);
      if (!currentNode) break;

      // Check if we've reached final
      if (currentNode.type === 'final') {
        return {
          path,
          stoppedOn: currentPos,
          reason: 'final',
          pendingTile: false,
          simGroupId: ctx.simGroupId,
          historyAfter: newHistory
        };
      }

      // Check for branching
      if (currentNode.neighbors.length === 0) {
        // Dead end (shouldn't happen except at final)
        break;
      }

      let nextNode: NodeId;
      if (currentNode.neighbors.length > 1 && remainingSteps > 0) {
        // Need branch choice - for now use lowest ID
        nextNode = Math.min(...currentNode.neighbors);
      } else {
        nextNode = currentNode.neighbors[0];
      }

      // Create movement step
      const step: MovementStep = {
        from: currentPos,
        to: nextNode,
        onStepEnterFired: ctx.allowPassOverTriggers && remainingSteps > 1
      };

      path.push(step);
      currentPos = nextNode;
      newHistory.push(nextNode);
      remainingSteps--;
    }
  } else if (ctx.direction === 'backward') {
    // Backward movement using history first, then reverse traversal
    while (remainingSteps > 0) {
      // Try to use movement history first
      if (newHistory.length > 1) {
        const prevPos = newHistory[newHistory.length - 2];
        const step: MovementStep = {
          from: currentPos,
          to: prevPos,
          onStepEnterFired: false // No triggers on backward movement typically
        };
        path.push(step);
        currentPos = prevPos;
        newHistory.pop();
        remainingSteps--;
      } else {
        // Use reverse traversal
        const preds = getPredecessors(board, currentPos);
        if (preds.length === 0) {
          // At start node, can't go back further
          break;
        }

        // Deterministic selection: prefer lastFrom if available, else lowest ID
        const nextNode = preds[0]; // Lowest ID (already sorted)

        const step: MovementStep = {
          from: currentPos,
          to: nextNode,
          onStepEnterFired: false
        };
        path.push(step);
        currentPos = nextNode;
        remainingSteps--;
      }
    }
  }

  return {
    path,
    stoppedOn: currentPos,
    reason: 'stepsConsumed',
    pendingTile: ctx.targetUid !== ctx.actorUid,
    simGroupId: ctx.simGroupId,
    historyAfter: newHistory
  };
}

export function chooseBranch(
  current: NodeId,
  options: NodeId[],
  ctx: MoveContext
): NodeId {
  // Deterministic fallback: choose minimum ID
  if (options.length === 0) {
    throw new Error('No branch options available');
  }
  return Math.min(...options);
}

export function applyLampIfEligible(
  board: BoardGraphExtended,
  stoppedOn: NodeId,
  ctx: MoveContext,
  movementHistory: NodeId[],
  state: EngineState
): { finalStop: NodeId; historyAfter: NodeId[] } {
  // Lamp only works if allowed and conditions met
  if (!ctx.allowLamp) {
    return { finalStop: stoppedOn, historyAfter: movementHistory };
  }

  // Check if tile has player or enemy
  const tile = getTileNode(board, stoppedOn);
  if (!tile) {
    return { finalStop: stoppedOn, historyAfter: movementHistory };
  }

  let hasPlayerOrEnemy = false;

  // Check for other players
  const otherPlayers = Object.values(state.players)
    .filter(p => p.uid !== ctx.targetUid && p.position === stoppedOn);
  if (otherPlayers.length > 0) {
    hasPlayerOrEnemy = true;
  }

  // Check for enemy tile
  if (tile.type === 'enemy') {
    hasPlayerOrEnemy = true;
  }

  // Check for enemies on tile
  const tileState = state.tileState[stoppedOn.toString()];
  if (tileState?.enemies && tileState.enemies.length > 0) {
    hasPlayerOrEnemy = true;
  }

  if (!hasPlayerOrEnemy) {
    return { finalStop: stoppedOn, historyAfter: movementHistory };
  }

  // Can only lamp if we moved forward this turn (history > 1)
  if (movementHistory.length <= 1) {
    return { finalStop: stoppedOn, historyAfter: movementHistory };
  }

  // Step back one tile
  const newHistory = [...movementHistory];
  newHistory.pop();
  const previousTile = newHistory[newHistory.length - 1];

  return {
    finalStop: previousTile,
    historyAfter: newHistory
  };
}

export function canRetreat(
  state: EngineState,
  playerId: PlayerId,
  steps: number = 6
): { canRetreat: boolean; destination?: NodeId } {
  const player = state.players[playerId];
  if (!player) return { canRetreat: false };

  const board = state.board.graph as BoardGraphExtended;
  const result = computeMovementSteps(
    board,
    player.position,
    steps,
    {
      actorUid: playerId,
      targetUid: playerId,
      moveStyle: 'step',
      direction: 'backward',
      allowPassOverTriggers: false,
      allowDuels: false,
      allowLamp: false,
      source: 'retreat'
    },
    player.movementHistory.forwardThisTurn
  );

  return {
    canRetreat: true,
    destination: result.stoppedOn
  };
}

export function validateMovePath(
  board: BoardGraphExtended,
  from: NodeId,
  path: NodeId[]
): boolean {
  if (path.length === 0) return true;

  let current = from;
  for (const next of path) {
    if (!isValidPath(board, current, next)) {
      return false;
    }
    current = next;
  }
  return true;
}