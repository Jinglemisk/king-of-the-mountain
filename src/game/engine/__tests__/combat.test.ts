import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveCombatRound, initiateCombat, handleRetreat, checkCombatEnd,
  applyDamage
} from '../combat';
import type { CombatTarget } from '../combat';
import type { EngineState, EngineContext, FightState, DuelState } from '../types';
import { createEnemyInstance } from '../../data/content';
import { generateUID } from '../../util/rng';

describe('Combat System', () => {
  let mockState: EngineState;
  let mockContext: EngineContext;

  beforeEach(() => {
    mockState = {
      gameId: 'test-game',
      phase: 'combat',
      currentTurn: 0,
      turnOrder: ['player1', 'player2'],
      turnCounter: 1,
      startTime: Date.now(),
      players: {
        player1: {
          uid: 'player1',
          position: 'tile-1',
          hp: 5,
          maxHp: 5,
          classId: 'hunter',
          equipped: {
            wearable: null,
            holdables: [
              {
                instanceId: 'item-1',
                id: 'dagger',
                name: 'Dagger',
                category: 'holdable',
                tier: 'T1',
                tags: ['weapon']
              },
              null
            ]
          },
          inventory: {
            bandolier: [],
            backpack: []
          },
          movementHistory: ['start', 'tile-0'],
          activeEffects: [],
          mustSleep: false
        },
        player2: {
          uid: 'player2',
          position: 'tile-1',
          hp: 5,
          maxHp: 5,
          classId: 'duelist',
          equipped: {
            wearable: null,
            holdables: [null, null]
          },
          inventory: {
            bandolier: [],
            backpack: []
          },
          movementHistory: ['start'],
          activeEffects: [],
          mustSleep: false
        }
      },
      board: {
        nodes: {
          'start': { id: 'start', type: 'start', x: 0, y: 0 },
          'tile-0': { id: 'tile-0', type: 'empty', x: 1, y: 0 },
          'tile-1': { id: 'tile-1', type: 'enemy', x: 2, y: 0, tier: 'T1' }
        },
        edges: {
          'e1': { from: 'start', to: 'tile-0' },
          'e2': { from: 'tile-0', to: 'tile-1' }
        }
      },
      tiles: {},
      decks: {
        treasureT1: { drawPile: [], discardPile: [] },
        treasureT2: { drawPile: [], discardPile: [] },
        treasureT3: { drawPile: [], discardPile: [] },
        chance: { drawPile: [], discardPile: [] },
        enemyT1: { drawPile: [], discardPile: [] },
        enemyT2: { drawPile: [], discardPile: [] },
        enemyT3: { drawPile: [], discardPile: [] }
      },
      rng: {
        seed: 'test-seed',
        counter: 0,
        audit: []
      },
      combatInternal: null
    } as EngineState;

    let rollCounter = 0;
    const mockRolls = [4, 3, 2, 1, 5, 6, 3, 4];

    mockContext = {
      now: () => Date.now(),
      rng: {
        state: mockState.rng,
        roll: (die, actor, requestId) => {
          const value = mockRolls[rollCounter % mockRolls.length];
          rollCounter++;
          return {
            id: generateUID(),
            die,
            value,
            actor
          };
        },
        shuffle: (arr) => [...arr],
        weightedPick: (items, weights) => ({ index: 0, item: items[0] })
      },
      emit: () => {}
    };
  });

  describe('initiateCombat', () => {
    it('should initiate a fight with enemies', () => {
      const enemies = [
        createEnemyInstance('goblin'),
        createEnemyInstance('skeleton')
      ];

      const { combat, events } = initiateCombat(
        mockState,
        'fight',
        { playerId: 'player1', enemyQueue: enemies },
        mockContext
      );

      expect(combat.type).toBe('fight');
      expect((combat as FightState).playerId).toBe('player1');
      expect((combat as FightState).enemyQueue).toHaveLength(2);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('CombatStarted');
    });

    it('should initiate a duel between players', () => {
      const { combat, events } = initiateCombat(
        mockState,
        'duel',
        { duelPlayers: ['player1', 'player2'] },
        mockContext
      );

      expect(combat.type).toBe('duel');
      expect((combat as DuelState).a).toBe('player1');
      expect((combat as DuelState).b).toBe('player2');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DuelStarted');
    });
  });

  describe('resolveCombatRound', () => {
    it('should resolve a fight round with damage calculation', () => {
      const enemies = [createEnemyInstance('goblin')];
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: enemies,
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: ['start', 'tile-0']
      };

      const target: CombatTarget = { enemyIndex: 0 };
      const result = resolveCombatRound(mockState, combat, target, mockContext);

      expect(result.roundNumber).toBe(1);
      expect(result.damageToPlayer.size).toBeGreaterThanOrEqual(0);
      expect(result.damageToEnemies.size).toBeGreaterThanOrEqual(0);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('CombatRoundResolved');
    });

    it('should apply Hunter class bonus against creatures', () => {
      const enemies = [createEnemyInstance('goblin')];
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: enemies,
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      const target: CombatTarget = { enemyIndex: 0 };
      const result = resolveCombatRound(mockState, combat, target, mockContext);

      expect(result.log.attacker.mods.attack).toBeGreaterThan(0);
    });

    it('should handle Duelist reroll in duels', () => {
      const combat: DuelState = {
        type: 'duel',
        a: 'player1',
        b: 'player2',
        currentRound: 1,
        roundLog: [],
        defenseRerollUsed: {},
        offeredBy: 'player1'
      };

      const result = resolveCombatRound(mockState, combat, null, mockContext);

      expect(result.roundNumber).toBe(1);
      expect(result.events).toBeDefined();
    });
  });

  describe('handleRetreat', () => {
    it('should move player back 6 tiles on retreat', () => {
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: [],
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: ['start', 'tile-0', 'tile-1']
      };

      const { movements, events } = handleRetreat(
        mockState,
        combat,
        'player1',
        mockContext
      );

      expect(movements.has('player1')).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RetreatExecuted');
    });
  });

  describe('checkCombatEnd', () => {
    it('should end fight when all enemies are defeated', () => {
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: [
          { ...createEnemyInstance('goblin'), currentHp: 0 }
        ],
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      const lastRound = {
        roundNumber: 1,
        log: {} as any,
        damageToPlayer: new Map(),
        damageToEnemies: new Map(),
        defeatedEnemies: [0],
        defeatedPlayers: [],
        events: []
      };

      const result = checkCombatEnd(mockState, combat, lastRound);

      expect(result.winner).toBe('player1');
      expect(result.loser).toBe('enemies');
      expect(result.finalState).toBeNull();
    });

    it('should handle player defeat in fight', () => {
      mockState.players.player1.hp = 0;

      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: [createEnemyInstance('goblin')],
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      const lastRound = {
        roundNumber: 1,
        log: {} as any,
        damageToPlayer: new Map([['player1', 1]]),
        damageToEnemies: new Map(),
        defeatedEnemies: [],
        defeatedPlayers: ['player1'],
        events: []
      };

      const result = checkCombatEnd(mockState, combat, lastRound);

      expect(result.winner).toBe('enemies');
      expect(result.loser).toBe('player1');
      expect(result.mustSleep).toContain('player1');
    });

    it('should handle double KO in duel', () => {
      mockState.players.player1.hp = 0;
      mockState.players.player2.hp = 0;

      const combat: DuelState = {
        type: 'duel',
        a: 'player1',
        b: 'player2',
        currentRound: 1,
        roundLog: [],
        defenseRerollUsed: {},
        offeredBy: 'player1'
      };

      const lastRound = {
        roundNumber: 1,
        log: {} as any,
        damageToPlayer: new Map([['player1', 1], ['player2', 1]]),
        damageToEnemies: new Map(),
        defeatedEnemies: [],
        defeatedPlayers: ['player1', 'player2'],
        events: []
      };

      const result = checkCombatEnd(mockState, combat, lastRound);

      expect(result.winner).toBeUndefined();
      expect(result.mustSleep).toContain('player1');
      expect(result.mustSleep).toContain('player2');
    });
  });

  describe('applyDamage', () => {
    it('should reduce player HP correctly', () => {
      const damageMap = new Map([['player1', 2]]);
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: [],
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      applyDamage(mockState, damageMap, new Map(), combat);

      expect(mockState.players.player1.hp).toBe(3);
    });

    it('should reduce enemy HP correctly', () => {
      const enemies = [createEnemyInstance('goblin')];
      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: enemies,
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      const enemyDamage = new Map([[0, 1]]);
      applyDamage(mockState, new Map(), enemyDamage, combat);

      expect(combat.enemyQueue[0].currentHp).toBe(0);
    });
  });

  describe('Raider bonus loot', () => {
    it('should trigger Raider bonus on victory', () => {
      mockState.players.player1.classId = 'raider';

      const combat: FightState = {
        type: 'fight',
        tileId: 'tile-1',
        playerId: 'player1',
        enemyQueue: [
          { ...createEnemyInstance('goblin'), currentHp: 0 }
        ],
        currentRound: 1,
        roundLog: [],
        retreatHistorySnapshot: []
      };

      const lastRound = {
        roundNumber: 1,
        log: {} as any,
        damageToPlayer: new Map(),
        damageToEnemies: new Map(),
        defeatedEnemies: [0],
        defeatedPlayers: [],
        events: []
      };

      const result = checkCombatEnd(mockState, combat, lastRound);

      expect(result.loot).toBeDefined();
    });
  });
});