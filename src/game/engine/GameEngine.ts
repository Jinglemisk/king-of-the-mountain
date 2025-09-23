// /src/game/engine/GameEngine.ts
// Main game engine class

import {
  GameState,
  PlayerId,
  GameId,
  NodeId,
  ClassId,
  PlayerState,
  GamePhase,
  CombatPublicState
} from '../types';

import {
  EngineState,
  EngineApi,
  EngineContext,
  EngineUpdate,
  Action,
  DomainEvent,
  Selectors,
  Invariants,
  RNG,
  InvalidActionError
} from './types';

import { loadBoard, BoardGraphExtended } from './board';
import { createRNG, createRNGState } from '../util/rng';
import {
  isActionAllowed,
  getNextPhase,
  applyPhaseTransition,
  getLegalActionsForPhase
} from './phases';
import {
  computeMovementSteps,
  chooseBranch,
  applyLampIfEligible,
  canRetreat
} from './movement';

export class GameEngine implements EngineApi {
  // Invariants
  readonly INV: Invariants = {
    MAX_HP_BASE: 5,
    EQUIP_WEARABLE_MAX: 1,
    EQUIP_HOLDABLE_MAX: 2,
    BANDOLIER_BASE_MAX: 1,
    BACKPACK_BASE_MAX: 1,
    D4_MIN: 1,
    D4_MAX: 4,
    D6_MIN: 1,
    D6_MAX: 6
  };

  // Selectors
  readonly selectors: Selectors = {
    currentPlayerId: (s: EngineState) => s.currentPlayer,

    isPlayersTurn: (s: EngineState, uid: PlayerId) => s.currentPlayer === uid,

    legalActionsFor: (s: EngineState, uid: PlayerId) => {
      return getLegalActionsForPhase(s, uid);
    },

    playerById: (s: EngineState, uid: PlayerId) => {
      const player = s.players[uid];
      if (!player) throw new Error(`Player ${uid} not found`);
      return player;
    },

    tileRuntime: (s: EngineState, nodeId: NodeId) => {
      return s.tileState[nodeId.toString()];
    },

    movementCapacity: (s: EngineState, uid: PlayerId) => {
      const player = s.players[uid];
      if (!player) throw new Error(`Player ${uid} not found`);

      let bandolier = this.INV.BANDOLIER_BASE_MAX;
      let backpack = this.INV.BACKPACK_BASE_MAX;

      // Class bonuses
      if (player.classId === 'class.alchemist.v1') {
        bandolier += 1;
      }
      if (player.classId === 'class.porter.v1') {
        backpack += 1;
      }

      return {
        holdableSlots: this.INV.EQUIP_HOLDABLE_MAX,
        wearableSlots: this.INV.EQUIP_WEARABLE_MAX,
        bandolier,
        backpack
      };
    }
  };

  applyAction(state: EngineState, action: Action, ctx: EngineContext): EngineUpdate {
    // Validate action is allowed in current phase
    if (!isActionAllowed(state, action)) {
      throw new InvalidActionError(
        `Action ${action.type} not allowed in phase ${state.phase}`,
        action
      );
    }

    // Dispatch to specific action handlers
    switch (action.type) {
      case 'startGame':
        return this.handleStartGame(state, action, ctx);
      case 'rollMovement':
        return this.handleRollMovement(state, action, ctx);
      case 'chooseSleep':
        return this.handleChooseSleep(state, action, ctx);
      case 'chooseBranch':
        return this.handleChooseBranch(state, action as any, ctx);
      case 'resolvePendingTile':
        return this.handleResolvePendingTile(state, action, ctx);
      case 'retreat':
        return this.handleRetreat(state, action, ctx);
      case 'endTurn':
        return this.handleEndTurn(state, action, ctx);
      default:
        // Placeholder for other actions
        return { state, events: [] };
    }
  }

  stepPhase(state: EngineState, ctx: EngineContext): EngineUpdate {
    const nextPhase = getNextPhase(state.phase, state);

    if (!nextPhase) {
      // Game ended
      return {
        state: { ...state, status: 'ended' },
        events: [{
          id: `evt_${Date.now()}`,
          ts: ctx.now(),
          type: 'GameEnded',
          payload: { winner: state.currentPlayer }
        }]
      };
    }

    return applyPhaseTransition(state, state.phase, nextPhase, ctx);
  }

  createRng(state: import('../types').RNGState): RNG {
    return createRNG(state) as RNG;
  }

  toPublicState(state: EngineState): GameState {
    // Convert internal combat state to public view
    let publicCombat: CombatPublicState = null;

    if (state.combatInternal) {
      if (state.combatInternal.type === 'fight') {
        publicCombat = {
          type: 'fight',
          tileId: state.combatInternal.tileId,
          playerId: state.combatInternal.playerId,
          enemyQueue: state.combatInternal.enemyQueue,
          currentRound: state.combatInternal.currentRound
        };
      } else if (state.combatInternal.type === 'duel') {
        publicCombat = {
          type: 'duel',
          a: state.combatInternal.a,
          b: state.combatInternal.b,
          currentRound: state.combatInternal.currentRound
        };
      }
    }

    return {
      ...state,
      combat: publicCombat
    };
  }

  // Helper to create initial game state
  createInitialState(
    gameId: GameId,
    playerIds: PlayerId[],
    seed?: string
  ): EngineState {
    const board = loadBoard('board.v1');

    const players: Record<PlayerId, PlayerState> = {};
    playerIds.forEach((uid, idx) => {
      players[uid] = this.createInitialPlayerState(uid, idx);
    });

    const state: EngineState = {
      id: gameId,
      version: 0,
      schemaVersion: '1.0.0',
      status: 'lobby',
      phase: 'turnStart',
      currentPlayer: null,
      board: {
        id: 'board.v1',
        graph: board,
        playerPositions: Object.fromEntries(playerIds.map(uid => [uid, 0]))
      },
      players,
      order: {
        seats: playerIds,
        currentIdx: 0
      },
      decks: {
        treasure: {
          t1: { drawPile: [], discardPile: [] },
          t2: { drawPile: [], discardPile: [] },
          t3: { drawPile: [], discardPile: [] }
        },
        chance: {
          main: { drawPile: [], discardPile: [] }
        },
        enemies: {
          t1: { drawPile: [], discardPile: [] },
          t2: { drawPile: [], discardPile: [] },
          t3: { drawPile: [], discardPile: [] }
        }
      },
      tileState: {},
      combatInternal: null,
      finalTieBreaker: undefined,
      rng: createRNGState(seed),
      logVersion: 0,
      combat: null
    };

    return state;
  }

  private createInitialPlayerState(uid: PlayerId, seat: number): PlayerState {
    return {
      uid,
      seat,
      nickname: `Player ${seat + 1}`,
      classId: 'class.scout.v1', // Default, will be selected
      classFlags: {},
      position: 0,
      hp: this.INV.MAX_HP_BASE,
      maxHp: this.INV.MAX_HP_BASE,
      alive: true,
      equipped: {
        wearable: undefined,
        holdables: []
      },
      inventory: {
        bandolier: [],
        backpack: []
      },
      heldEffects: [],
      movementHistory: {
        forwardThisTurn: [0],
        lastFrom: undefined
      },
      perTurn: {}
    };
  }

  // Action handlers
  private handleStartGame(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    // Set game status to playing
    newState.status = 'playing';
    newState.currentPlayer = newState.order.seats[0];

    // Shuffle decks (would implement actual deck content loading)
    const rng = ctx.rng;

    // TODO: Load actual deck content from data files
    // For now, just emit the event
    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'GameStarted',
      actor: action.uid,
      payload: { gameId: newState.id }
    });

    return { state: newState, events };
  }

  private handleRollMovement(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    if (!newState.currentPlayer || action.uid !== newState.currentPlayer) {
      throw new InvalidActionError('Not your turn', action);
    }

    const player = newState.players[newState.currentPlayer];
    const board = newState.board.graph as BoardGraphExtended;
    const roll = ctx.rng.roll('d4', action.uid);

    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'DiceRolled',
      actor: action.uid,
      payload: {
        die: 'd4',
        value: roll.value,
        purpose: 'movement'
      }
    });

    // Apply movement modifiers
    let totalSteps = roll.value;
    // TODO: Add item/effect modifiers here

    // Compute movement path
    const moveResult = computeMovementSteps(
      board,
      player.position,
      totalSteps,
      {
        actorUid: action.uid,
        targetUid: action.uid,
        moveStyle: 'step',
        direction: 'forward',
        allowPassOverTriggers: true,
        allowDuels: true,
        allowLamp: true,
        source: 'turnMove'
      },
      player.movementHistory.forwardThisTurn
    );

    // Apply Lamp if eligible
    const lampResult = applyLampIfEligible(
      board,
      moveResult.stoppedOn,
      {
        actorUid: action.uid,
        targetUid: action.uid,
        moveStyle: 'step',
        direction: 'forward',
        allowPassOverTriggers: true,
        allowDuels: true,
        allowLamp: true,
        source: 'turnMove'
      },
      moveResult.historyAfter || player.movementHistory.forwardThisTurn,
      newState
    );

    // Update position and history
    player.position = lampResult.finalStop;
    newState.board.playerPositions[action.uid] = lampResult.finalStop;
    player.movementHistory.forwardThisTurn = lampResult.historyAfter;

    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'Moved',
      actor: action.uid,
      payload: {
        from: player.position,
        to: lampResult.finalStop,
        steps: roll.value,
        path: moveResult.path
      }
    });

    // Check for final tile
    const finalNode = board.nodes.find(n => n.id === lampResult.finalStop);
    if (finalNode?.type === 'final') {
      events.push({
        id: `evt_${Date.now()}`,
        ts: ctx.now(),
        type: 'GameEnded',
        payload: {
          winner: action.uid,
          finalTile: lampResult.finalStop
        }
      });
      newState.status = 'ended';
      return { state: newState, events };
    }

    // Transition to resolveTile phase
    return applyPhaseTransition(newState, 'moveOrSleep', 'resolveTile', ctx);
  }

  private handleChooseSleep(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    if (!newState.currentPlayer || action.uid !== newState.currentPlayer) {
      throw new InvalidActionError('Not your turn', action);
    }

    const player = newState.players[newState.currentPlayer];

    // Heal to max HP
    player.hp = player.maxHp;

    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'DamageApplied',
      actor: action.uid,
      payload: {
        target: action.uid,
        amount: player.maxHp - player.hp,
        type: 'heal',
        source: 'sleep'
      }
    });

    // Still need to resolve tile (in case it's an enemy tile)
    return applyPhaseTransition(newState, 'moveOrSleep', 'resolveTile', ctx);
  }

  private handleEndTurn(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const newState = { ...state };

    // Clear per-turn effects
    if (newState.currentPlayer) {
      const player = newState.players[newState.currentPlayer];
      player.perTurn = {};
    }

    // Transition handles advancing to next player
    return applyPhaseTransition(newState, 'endTurn', 'turnStart', ctx);
  }

  private handleChooseBranch(
    state: EngineState,
    action: Action & { from: NodeId; to: NodeId },
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    if (!newState.currentPlayer || action.uid !== newState.currentPlayer) {
      throw new InvalidActionError('Not your turn', action);
    }

    const player = newState.players[newState.currentPlayer];
    const board = newState.board.graph as BoardGraphExtended;

    // Validate the branch choice
    const currentNode = board.nodes.find(n => n.id === action.from);
    if (!currentNode || !currentNode.neighbors.includes(action.to)) {
      throw new InvalidActionError('Invalid branch choice', action);
    }

    // Apply the movement step
    player.position = action.to;
    newState.board.playerPositions[action.uid] = action.to;
    player.movementHistory.forwardThisTurn.push(action.to);

    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'Moved',
      actor: action.uid,
      payload: {
        from: action.from,
        to: action.to,
        branch: true
      }
    });

    return { state: newState, events };
  }

  private handleResolvePendingTile(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    if (!newState.currentPlayer || action.uid !== newState.currentPlayer) {
      throw new InvalidActionError('Not your turn', action);
    }

    const player = newState.players[newState.currentPlayer];

    if (player.pendingTileId === undefined) {
      return { state: newState, events };
    }

    // Clear pending tile
    const pendingTileId = player.pendingTileId;
    player.pendingTileId = undefined;

    events.push({
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'TileEntered',
      actor: action.uid,
      payload: {
        tileId: pendingTileId,
        pending: true
      }
    });

    // Transition to resolveTile phase
    return applyPhaseTransition(newState, 'turnStart', 'resolveTile', ctx);
  }

  private handleRetreat(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    const events: DomainEvent[] = [];
    const newState = { ...state };

    const player = newState.players[action.uid];
    if (!player) {
      throw new InvalidActionError('Player not found', action);
    }

    // Check if player is in combat or duel
    if (newState.combatInternal) {
      const isInCombat =
        (newState.combatInternal.type === 'fight' && newState.combatInternal.playerId === action.uid) ||
        (newState.combatInternal.type === 'duel' && (newState.combatInternal.a === action.uid || newState.combatInternal.b === action.uid));

      if (!isInCombat) {
        throw new InvalidActionError('Not in combat', action);
      }

      // Perform retreat movement
      const board = newState.board.graph as BoardGraphExtended;
      const retreatResult = computeMovementSteps(
        board,
        player.position,
        6,
        {
          actorUid: action.uid,
          targetUid: action.uid,
          moveStyle: 'step',
          direction: 'backward',
          allowPassOverTriggers: false,
          allowDuels: false,
          allowLamp: false,
          source: 'retreat'
        },
        player.movementHistory.forwardThisTurn
      );

      // Update position
      player.position = retreatResult.stoppedOn;
      newState.board.playerPositions[action.uid] = retreatResult.stoppedOn;
      player.movementHistory.forwardThisTurn = retreatResult.historyAfter || [];

      // Clear combat
      newState.combatInternal = null;

      events.push({
        id: `evt_${Date.now()}`,
        ts: ctx.now(),
        type: 'RetreatExecuted',
        actor: action.uid,
        payload: {
          from: player.position,
          to: retreatResult.stoppedOn,
          steps: retreatResult.path.length
        }
      });

      // End turn immediately if current player retreats
      if (action.uid === newState.currentPlayer) {
        return applyPhaseTransition(newState, newState.phase, 'endTurn', ctx);
      }
    }

    return { state: newState, events };
  }
}