// /src/game/engine/phases.ts
// Turn and phase state machine implementation

import type { GamePhase, PlayerId } from '../types';
import type {
  EngineState,
  EngineContext,
  EngineUpdate,
  DomainEvent,
  Action
} from './types';

export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  condition?: (state: EngineState) => boolean;
  handler?: (state: EngineState, ctx: EngineContext) => EngineUpdate;
}

export interface PhaseGuard {
  phase: GamePhase;
  allowedActions: Action['type'][];
  canTransition: (state: EngineState, action: Action) => boolean;
}

// Phase guards defining what actions are allowed in each phase
export const phaseGuards: Record<GamePhase, PhaseGuard> = {
  turnStart: {
    phase: 'turnStart',
    allowedActions: ['resolvePendingTile', 'endTurn'],
    canTransition: (state, action) => {
      // turnStart can progress via endTurn or handle pending tiles
      if (action.type === 'endTurn') {
        return action.uid === state.currentPlayer;
      }
      return action.type === 'resolvePendingTile' ||
             action.type === 'useItem'; // For "at start of your turn" items
    }
  },
  manage: {
    phase: 'manage',
    allowedActions: ['swapEquipment', 'equipItem', 'unequipItem', 'useItem', 'endTurn'],
    canTransition: (state, action) => {
      return action.uid === state.currentPlayer;
    }
  },
  preDuel: {
    phase: 'preDuel',
    allowedActions: ['offerDuel', 'acceptDuel', 'declineDuel', 'useItem', 'endTurn'],
    canTransition: (state, action) => {
      if (action.type === 'offerDuel') {
        // Any co-located player can offer duel
        const actor = state.players[action.uid];
        const currentPlayer = state.currentPlayer ? state.players[state.currentPlayer] : null;
        return actor && currentPlayer &&
               actor.position === currentPlayer.position;
      }
      return true;
    }
  },
  moveOrSleep: {
    phase: 'moveOrSleep',
    allowedActions: ['chooseSleep', 'rollMovement', 'chooseBranch', 'useItem'],
    canTransition: (state, action) => {
      return action.uid === state.currentPlayer;
    }
  },
  resolveTile: {
    phase: 'resolveTile',
    allowedActions: ['useItem', 'endTurn'],
    canTransition: (state, action) => {
      // Tile resolution is mostly automatic
      return action.uid === state.currentPlayer;
    }
  },
  combat: {
    phase: 'combat',
    allowedActions: ['retreat', 'useItem'],
    canTransition: (state, action) => {
      // During combat, only the fighting player can act
      if (state.combatInternal?.type === 'fight') {
        return action.uid === state.combatInternal.playerId;
      }
      return false;
    }
  },
  duel: {
    phase: 'duel',
    allowedActions: ['retreat', 'useItem'],
    canTransition: (state, action) => {
      // During duel, either participant can retreat
      if (state.combatInternal?.type === 'duel') {
        return action.uid === state.combatInternal.a ||
               action.uid === state.combatInternal.b;
      }
      return false;
    }
  },
  postCombat: {
    phase: 'postCombat',
    allowedActions: ['dropItem', 'pickUpDropped'],
    canTransition: (state, action) => {
      // Loot and cleanup
      return true;
    }
  },
  capacity: {
    phase: 'capacity',
    allowedActions: ['dropItem', 'pickUpDropped', 'endTurn'],
    canTransition: (state, action) => {
      if (action.type === 'dropItem') {
        return action.uid === state.currentPlayer;
      }
      if (action.type === 'pickUpDropped') {
        // Co-located players can pick up dropped items
        const actor = state.players[action.uid];
        const currentPlayer = state.currentPlayer ? state.players[state.currentPlayer] : null;
        return actor && currentPlayer &&
               actor.position === currentPlayer.position;
      }
      if (action.type === 'endTurn') {
        return action.uid === state.currentPlayer;
      }
      return false;
    }
  },
  endTurn: {
    phase: 'endTurn',
    allowedActions: ['endTurn'],
    canTransition: (state, action) => {
      return action.uid === state.currentPlayer;
    }
  },
  finalTieBreaker: {
    phase: 'finalTieBreaker',
    allowedActions: ['acceptDuel'],
    canTransition: (state, action) => {
      // Bracket duels are automatic
      return state.finalTieBreaker !== undefined;
    }
  }
};

// Phase transition logic
export function getNextPhase(
  currentPhase: GamePhase,
  state: EngineState
): GamePhase | null {
  switch (currentPhase) {
    case 'turnStart':
      // Check for pending tile
      if (state.currentPlayer && state.players[state.currentPlayer]?.pendingTileId !== undefined) {
        return 'resolveTile';
      }
      // Check for skip turn
      if (state.currentPlayer && state.players[state.currentPlayer]?.skipNextTurn) {
        return 'endTurn';
      }
      return 'manage';

    case 'manage':
      return 'preDuel';

    case 'preDuel':
      // Check if duel started
      if (state.combatInternal?.type === 'duel') {
        return 'duel';
      }
      return 'moveOrSleep';

    case 'moveOrSleep':
      return 'resolveTile';

    case 'resolveTile':
      // Check tile type and route accordingly
      const currentPlayer = state.currentPlayer ? state.players[state.currentPlayer] : null;
      if (!currentPlayer) return 'endTurn';

      // Safely access board nodes
      if (!state.board?.graph?.nodes) {
        console.error('[phases.ts] Board graph not properly initialized');
        return 'endTurn';
      }

      const tile = state.board.graph.nodes.find(n => n.id === currentPlayer.position);
      if (tile?.type === 'enemy') {
        return 'combat';
      }
      if (tile?.type === 'final') {
        // Check for simultaneous arrivals
        const playersOnFinal = Object.values(state.players)
          .filter(p => p.position === tile.id);
        if (playersOnFinal.length > 1) {
          return 'finalTieBreaker';
        }
        // Single winner - game ends
        return null;
      }
      return 'capacity';

    case 'combat':
      return 'postCombat';

    case 'duel':
      return 'postCombat';

    case 'postCombat':
      return 'capacity';

    case 'capacity':
      // Check if we came from pending tile resolution
      if (state.currentPlayer && state.players[state.currentPlayer]?.pendingTileId !== undefined) {
        return 'manage';
      }
      // Always go to endTurn from capacity phase
      // (preDuel opportunities were already handled earlier in the turn)
      return 'endTurn';

    case 'endTurn':
      return 'turnStart';

    case 'finalTieBreaker':
      // Game ends after bracket
      return null;

    default:
      return null;
  }
}

// Check if an action is allowed in the current phase
export function isActionAllowed(
  state: EngineState,
  action: Action
): boolean {
  const guard = phaseGuards[state.phase];

  if (!guard) {
    return false;
  }

  if (!guard.allowedActions.includes(action.type)) {
    return false;
  }

  return guard.canTransition(state, action);
}

// Apply phase transition side effects
export function applyPhaseTransition(
  state: EngineState,
  fromPhase: GamePhase,
  toPhase: GamePhase,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];
  const newState = { ...state, phase: toPhase };

  // Emit phase change event
  events.push({
    id: `evt_${Date.now()}`,
    ts: ctx.now(),
    type: 'PhaseChanged',
    actor: state.currentPlayer || undefined,
    payload: { from: fromPhase, to: toPhase }
  });

  // Apply phase-specific entry side effects
  switch (toPhase) {
    case 'turnStart':
      // When entering turnStart from endTurn, advance to next player
      if (fromPhase === 'endTurn') {
        if (newState.order && newState.order.seats && newState.order.seats.length > 0) {
          newState.order.currentIdx = (newState.order.currentIdx + 1) % newState.order.seats.length;
          newState.currentPlayer = newState.order.seats[newState.order.currentIdx];
          newState.version++;
        } else {
          console.error('[phases] No order/seats in state during player advancement', {
            hasOrder: !!newState.order,
            seats: newState.order?.seats
          });
        }
      }

      // Clear per-turn effects for the new current player
      if (newState.currentPlayer) {
        const player = newState.players[newState.currentPlayer];
        if (player) {
          player.movementHistory = {
            forwardThisTurn: [player.position],
            lastFrom: undefined
          };
          player.perTurn = {};

          // Clear invisibility if expired
          if (player.invisibleUntilTs && ctx.now() >= player.invisibleUntilTs) {
            player.invisibleUntilTs = undefined;
          }

          events.push({
            id: `evt_${Date.now()}`,
            ts: ctx.now(),
            type: 'TurnStarted',
            actor: newState.currentPlayer,
            payload: { player: newState.currentPlayer }
          });
        }
      }
      break;

    case 'endTurn':
      // No longer advance player here - it happens when transitioning FROM endTurn TO turnStart
      break;
  }

  return {
    state: newState,
    events
  };
}

// Helper to get legal actions for a player in the current phase
export function getLegalActionsForPhase(
  state: EngineState,
  playerId: PlayerId
): Action['type'][] {
  const guard = phaseGuards[state.phase];
  if (!guard) return [];

  // Filter actions based on whether the player can perform them
  return guard.allowedActions.filter(actionType => {
    // Create a dummy action to test
    const testAction: Action = {
      id: 'test',
      ts: Date.now(),
      type: actionType as any,
      uid: playerId
    };

    return guard.canTransition(state, testAction);
  });
}