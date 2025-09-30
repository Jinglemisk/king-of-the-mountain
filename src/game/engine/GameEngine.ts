// /src/game/engine/GameEngine.ts
// Main game engine class

import type {
  GameState,
  PlayerId,
  GameId,
  NodeId,
  ClassId,
  PlayerState,
  GamePhase,
  CombatPublicState,
  EnemyInstance,
  ItemInstance
} from '../types';

import type {
  EngineState,
  EngineApi,
  EngineContext,
  EngineUpdate,
  Action,
  DomainEvent,
  Selectors,
  Invariants,
  RNG,
  OfferDuelAction,
  AcceptDuelAction,
  DeclineDuelAction,
  UseItemAction,
  EquipItemAction,
  UnequipItemAction,
  SwapEquipmentAction,
  DropItemAction,
  PickUpDroppedAction,
  ConsumePotionAction,
  PlayHeldEffectAction,
  RetreatAction,
  StartCombatAction,
  RollCombatAction
} from './types';
import { InvalidActionError } from './types';

import { loadBoard, buildReverseAdjacency } from './board';
import type { BoardGraphExtended } from './board';
import { createRNG, createRNGState, generateUID } from '../util/rng';
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
import type { CombatTarget } from './combat';
import {
  initiateCombat,
  resolveCombatRound,
  handleRetreat as handleCombatRetreat,
  checkCombatEnd,
  applyDamage
} from './combat';
import {
  handleOfferDuel,
  handleAcceptDuel,
  handleDeclineDuel,
  handleCombatTargeting,
  startCombatWithEnemies
} from './commands/combat';
import {
  handleUseItem,
  handleEquipItem,
  handleUnequipItem,
  handleSwapEquipment,
  handleDropItem,
  handlePickUpDropped,
  handleConsumePotion,
  handlePlayHeldEffect,
  handleCapacityEnforcement
} from './commands/items';
import {
  getEnemyComposition,
  createEnemyInstance,
  getTreasureDeck,
  getChanceDeck,
  getEnemyDeck,
  createItemInstance
} from '../data/content';
import { resolveTileEffect } from './tileResolver';

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

  // Helper to ensure board is properly extended
  private ensureBoardExtended(state: EngineState): BoardGraphExtended {
    if (!state.board || !state.board.graph) {
      throw new Error('Game board not initialized');
    }

    let board = state.board.graph as BoardGraphExtended;

    // Check if board needs extension
    if (!board.reverseAdj) {
      board = {
        ...state.board.graph,
        reverseAdj: buildReverseAdjacency(state.board.graph)
      } as BoardGraphExtended;
      // Update the state with the extended board
      state.board.graph = board;
    }

    return board;
  }

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
        return this.handleRetreat(state, action as RetreatAction, ctx);
      case 'endTurn':
        return this.handleEndTurn(state, action, ctx);
      case 'offerDuel':
        return handleOfferDuel(state, action as OfferDuelAction, ctx);
      case 'acceptDuel':
        return handleAcceptDuel(state, action as AcceptDuelAction, ctx);
      case 'declineDuel':
        return handleDeclineDuel(state, action as DeclineDuelAction, ctx);
      case 'useItem':
        return handleUseItem(state, action as UseItemAction, ctx);
      case 'equipItem':
        return handleEquipItem(state, action as EquipItemAction, ctx);
      case 'unequipItem':
        return handleUnequipItem(state, action as UnequipItemAction, ctx);
      case 'swapEquipment':
        return handleSwapEquipment(state, action as SwapEquipmentAction, ctx);
      case 'dropItem':
        return handleDropItem(state, action as DropItemAction, ctx);
      case 'pickUpDropped':
        return handlePickUpDropped(state, action as PickUpDroppedAction, ctx);
      case 'consumePotion':
        return handleConsumePotion(state, action as ConsumePotionAction, ctx);
      case 'playHeldEffect':
        return handlePlayHeldEffect(state, action as PlayHeldEffectAction, ctx);
      case 'startCombat':
        return this.handleStartCombat(state, action as any, ctx);
      case 'rollCombat':
        return this.handleRollCombat(state, action as any, ctx);
      default:
        throw new InvalidActionError(`Unknown action type: ${action.type}`, action);
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
    newState.currentTurn = 0;
    newState.turnOrder = newState.order.seats;
    newState.turnCounter = 1;
    newState.startTime = ctx.now();

    // Initialize game decks
    const rng = ctx.rng;

    // Load and shuffle treasure decks
    if (!newState.decks.treasure) {
      newState.decks.treasure = {};
    }
    newState.decks.treasure.t1 = {
      drawPile: rng.shuffle(getTreasureDeck(1)),
      discardPile: []
    };
    newState.decks.treasure.t2 = {
      drawPile: rng.shuffle(getTreasureDeck(2)),
      discardPile: []
    };
    newState.decks.treasure.t3 = {
      drawPile: rng.shuffle(getTreasureDeck(3)),
      discardPile: []
    };

    // Load and shuffle chance deck
    if (!newState.decks.chance) {
      newState.decks.chance = {};
    }
    newState.decks.chance.main = {
      drawPile: rng.shuffle(getChanceDeck()),
      discardPile: []
    };

    // Load enemy decks (for spawning)
    if (!newState.decks.enemies) {
      newState.decks.enemies = {};
    }
    newState.decks.enemies.t1 = {
      drawPile: rng.shuffle(getEnemyDeck(1)),
      discardPile: []
    };
    newState.decks.enemies.t2 = {
      drawPile: rng.shuffle(getEnemyDeck(2)),
      discardPile: []
    };
    newState.decks.enemies.t3 = {
      drawPile: rng.shuffle(getEnemyDeck(3)),
      discardPile: []
    };

    events.push({
      id: generateUID(),
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
    const board = this.ensureBoardExtended(newState);
    const roll = ctx.rng.roll('d4', action.uid);

    const diceEvent = {
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'DiceRolled' as const,
      actor: action.uid,
      payload: {
        die: 'd4',
        value: roll.value,
        purpose: 'movement'
      }
    };
    events.push(diceEvent);

    // Emit dice roll event to UI
    if (ctx.emit) {
      ctx.emit(diceEvent);
    }

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

    const moveEvent = {
      id: `evt_${Date.now()}`,
      ts: ctx.now(),
      type: 'Moved' as const,
      actor: action.uid,
      payload: {
        from: player.position,
        to: lampResult.finalStop,
        steps: roll.value,
        path: moveResult.path
      }
    };
    events.push(moveEvent);

    // Emit movement event to UI
    if (ctx.emit) {
      ctx.emit(moveEvent);
    }

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

    // Skip tile resolution after sleep, go to capacity phase
    return applyPhaseTransition(newState, 'moveOrSleep', 'capacity', ctx);
  }

  private handleEndTurn(
    state: EngineState,
    action: Action,
    ctx: EngineContext
  ): EngineUpdate {
    console.log('[GameEngine] handleEndTurn called, current phase:', state.phase);
    let newState = { ...state };

    // Handle different phases that can call endTurn
    switch (state.phase) {
      case 'turnStart':
        // Progress from turnStart based on conditions
        const nextPhase = getNextPhase('turnStart', newState);
        if (nextPhase) {
          return applyPhaseTransition(newState, 'turnStart', nextPhase, ctx);
        }
        throw new InvalidActionError('Cannot determine next phase from turnStart', action);

      case 'manage':
        // Skip equipment management, go to preDuel
        return applyPhaseTransition(newState, 'manage', 'preDuel', ctx);

      case 'preDuel':
        // Skip duel offers, go to moveOrSleep
        return applyPhaseTransition(newState, 'preDuel', 'moveOrSleep', ctx);

      case 'resolveTile':
        // Resolve the tile the player landed on
        console.log('[GameEngine] endTurn called from resolveTile phase');
        if (newState.currentPlayer) {
          const player = newState.players[newState.currentPlayer];
          console.log('[GameEngine] Resolving tile at position:', player.position);
          const tileResult = resolveTileEffect(
            newState,
            newState.currentPlayer,
            player.position,
            ctx
          );
          console.log('[GameEngine] Tile resolution complete, got', tileResult.events.length, 'events');

          // Update state with tile resolution results
          newState = tileResult.state;

          // Emit all tile resolution events to UI
          console.log('[GameEngine] Emitting', tileResult.events.length, 'tile resolution events');
          for (const event of tileResult.events) {
            console.log('[GameEngine] Emitting event:', event.type, event);
            if (ctx.emit) {
              ctx.emit(event);
            } else {
              console.warn('[GameEngine] No ctx.emit function available!');
            }
          }

          // Check if we should start combat
          if (tileResult.shouldStartCombat && tileResult.drawnEnemies) {
            // Transition to combat phase with tile events
            const combatTransition = applyPhaseTransition(newState, 'resolveTile', 'combat', ctx);
            // Emit combat transition events
            for (const event of combatTransition.events) {
              if (ctx.emit) {
                ctx.emit(event);
              }
            }
            return {
              state: combatTransition.state,
              events: [...tileResult.events, ...combatTransition.events]
            };
          }

          // Otherwise go to capacity phase with tile events
          const capacityTransition = applyPhaseTransition(newState, 'resolveTile', 'capacity', ctx);
          // Emit capacity transition events
          for (const event of capacityTransition.events) {
            if (ctx.emit) {
              ctx.emit(event);
            }
          }
          return {
            state: capacityTransition.state,
            events: [...tileResult.events, ...capacityTransition.events]
          };
        }

        // Fallback if no current player
        return applyPhaseTransition(newState, 'resolveTile', 'capacity', ctx);

      case 'capacity':
        // Enforce capacity before transitioning
        const capacityUpdate = handleCapacityEnforcement(newState, ctx);
        newState.tiles = capacityUpdate.state.tiles;
        newState.players = capacityUpdate.state.players;
        return applyPhaseTransition(newState, 'capacity', 'endTurn', ctx);

      case 'endTurn':
        // Clear per-turn effects
        if (newState.currentPlayer) {
          const player = newState.players[newState.currentPlayer];
          player.perTurn = {};

          // Clear "this turn" active effects
          if (player.activeEffects) {
            player.activeEffects = player.activeEffects.filter(e => e.duration !== 'this-turn');
          }
        }

        // Transition to next player's turn
        return applyPhaseTransition(newState, 'endTurn', 'turnStart', ctx);

      default:
        throw new InvalidActionError(`Cannot end turn from phase: ${state.phase}`, action);
    }
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
    const board = this.ensureBoardExtended(newState);

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
    action: RetreatAction,
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

      // Use combat retreat handler
      const { movements, events: retreatEvents } = handleCombatRetreat(
        newState,
        newState.combatInternal,
        action.uid,
        ctx
      );

      // Apply movements
      for (const [playerId, newPosition] of movements) {
        newState.players[playerId].position = newPosition;
        newState.board.playerPositions[playerId] = newPosition;
        newState.players[playerId].pendingTileResolution = true;
      }

      // Clear combat
      newState.combatInternal = null;

      events.push(...retreatEvents);

      // End turn immediately if current player retreats
      if (action.uid === newState.currentPlayer) {
        return applyPhaseTransition(newState, newState.phase, 'endTurn', ctx);
      }
    }

    return { state: newState, events };
  }

  private handleStartCombat(
    state: EngineState,
    action: Action & { enemyIds: string[] },
    ctx: EngineContext
  ): EngineUpdate {
    // Delegate to the combat command handler
    return startCombatWithEnemies(state, action as any, ctx);
  }

  private handleRollCombat(
    state: EngineState,
    action: Action & { targetEnemyId?: string },
    ctx: EngineContext
  ): EngineUpdate {
    // Use the combat targeting handler
    return handleCombatTargeting(state, action as any, ctx);
  }
}