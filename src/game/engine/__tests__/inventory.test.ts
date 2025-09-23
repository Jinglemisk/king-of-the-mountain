import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlayerCapacity, canItemFitInSlot, findItemInInventory,
  removeItemFromSlot, addItemToSlot, enforceCapacity,
  useItem
} from '../inventory';
import type { InventorySlot, ItemMove } from '../inventory';
import type { EngineState, EngineContext } from '../types';
import type { ItemInstance } from '../../types';
import { generateUID } from '../../util/rng';

describe('Inventory System', () => {
  let mockState: EngineState;
  let mockContext: EngineContext;

  beforeEach(() => {
    mockState = {
      gameId: 'test-game',
      phase: 'manage',
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
          classId: 'scout',
          equipped: {
            wearable: null,
            holdables: [null, null]
          },
          inventory: {
            bandolier: [],
            backpack: []
          },
          movementHistory: [],
          activeEffects: [],
          mustSleep: false
        },
        player2: {
          uid: 'player2',
          position: 'tile-1',
          hp: 5,
          maxHp: 5,
          classId: 'alchemist',
          equipped: {
            wearable: null,
            holdables: [null, null]
          },
          inventory: {
            bandolier: [],
            backpack: []
          },
          movementHistory: [],
          activeEffects: [],
          mustSleep: false
        }
      },
      board: {
        nodes: {},
        edges: {}
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

    mockContext = {
      now: () => Date.now(),
      rng: {
        state: mockState.rng,
        roll: () => ({ id: 'roll-1', die: 'd6', value: 4 }),
        shuffle: (arr) => [...arr],
        weightedPick: (items) => ({ index: 0, item: items[0] })
      },
      emit: () => {}
    };
  });

  describe('getPlayerCapacity', () => {
    it('should return base capacity for normal class', () => {
      const capacity = getPlayerCapacity(mockState, 'player1');

      expect(capacity.wearable.max).toBe(1);
      expect(capacity.holdables.max).toBe(2);
      expect(capacity.bandolier.max).toBe(1);
      expect(capacity.backpack.max).toBe(1);
    });

    it('should return increased bandolier capacity for Alchemist', () => {
      const capacity = getPlayerCapacity(mockState, 'player2');

      expect(capacity.bandolier.max).toBe(2);
    });

    it('should return increased backpack capacity for Porter', () => {
      mockState.players.player1.classId = 'porter';
      const capacity = getPlayerCapacity(mockState, 'player1');

      expect(capacity.backpack.max).toBe(2);
    });

    it('should detect over-capacity correctly', () => {
      mockState.players.player1.inventory.bandolier = [
        { instanceId: '1', id: 'healing-potion', name: 'Healing Potion', category: 'drinkable', tier: 'T1' },
        { instanceId: '2', id: 'beer', name: 'Beer', category: 'drinkable', tier: 'T1' }
      ];

      const capacity = getPlayerCapacity(mockState, 'player1');
      expect(capacity.bandolier.over).toBe(true);
    });
  });

  describe('canItemFitInSlot', () => {
    it('should allow wearable in wearable slot', () => {
      const item: ItemInstance = {
        instanceId: '1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      const slot: InventorySlot = { area: 'equipped.wearable' };
      expect(canItemFitInSlot(item, slot)).toBe(true);
    });

    it('should allow holdable in holdable slot', () => {
      const item: ItemInstance = {
        instanceId: '1',
        id: 'dagger',
        name: 'Dagger',
        category: 'holdable',
        tier: 'T1'
      };

      const slot: InventorySlot = { area: 'equipped.holdables', index: 0 };
      expect(canItemFitInSlot(item, slot)).toBe(true);
    });

    it('should allow drinkable in bandolier', () => {
      const item: ItemInstance = {
        instanceId: '1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      const slot: InventorySlot = { area: 'inventory.bandolier' };
      expect(canItemFitInSlot(item, slot)).toBe(true);
    });

    it('should not allow wearable in bandolier', () => {
      const item: ItemInstance = {
        instanceId: '1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      const slot: InventorySlot = { area: 'inventory.bandolier' };
      expect(canItemFitInSlot(item, slot)).toBe(false);
    });
  });

  describe('findItemInInventory', () => {
    it('should find equipped wearable', () => {
      const item: ItemInstance = {
        instanceId: 'armor-1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      mockState.players.player1.equipped.wearable = item;

      const result = findItemInInventory(mockState, 'player1', 'armor-1');
      expect(result).toBeDefined();
      expect(result?.item.id).toBe('heirloom-armor');
      expect(result?.slot.area).toBe('equipped.wearable');
    });

    it('should find item in bandolier', () => {
      const item: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player1.inventory.bandolier.push(item);

      const result = findItemInInventory(mockState, 'player1', 'potion-1');
      expect(result).toBeDefined();
      expect(result?.slot.area).toBe('inventory.bandolier');
      expect(result?.slot.index).toBe(0);
    });

    it('should return null for non-existent item', () => {
      const result = findItemInInventory(mockState, 'player1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('removeItemFromSlot', () => {
    it('should remove wearable from equipped slot', () => {
      const item: ItemInstance = {
        instanceId: 'armor-1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      mockState.players.player1.equipped.wearable = item;

      const removed = removeItemFromSlot(mockState, 'player1', { area: 'equipped.wearable' });
      expect(removed).toBe(item);
      expect(mockState.players.player1.equipped.wearable).toBeNull();
    });

    it('should remove item from bandolier', () => {
      const item: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player1.inventory.bandolier.push(item);

      const removed = removeItemFromSlot(mockState, 'player1', { area: 'inventory.bandolier', index: 0 });
      expect(removed).toBe(item);
      expect(mockState.players.player1.inventory.bandolier).toHaveLength(0);
    });
  });

  describe('addItemToSlot', () => {
    it('should add wearable to equipped slot', () => {
      const item: ItemInstance = {
        instanceId: 'armor-1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      const success = addItemToSlot(mockState, 'player1', item, { area: 'equipped.wearable' });
      expect(success).toBe(true);
      expect(mockState.players.player1.equipped.wearable).toBe(item);
    });

    it('should not add to occupied wearable slot', () => {
      const item1: ItemInstance = {
        instanceId: 'armor-1',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      const item2: ItemInstance = {
        instanceId: 'armor-2',
        id: 'heirloom-armor',
        name: 'Heirloom Armor',
        category: 'wearable',
        tier: 'T2'
      };

      mockState.players.player1.equipped.wearable = item1;

      const success = addItemToSlot(mockState, 'player1', item2, { area: 'equipped.wearable' });
      expect(success).toBe(false);
    });

    it('should respect bandolier capacity', () => {
      const item1: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      const item2: ItemInstance = {
        instanceId: 'potion-2',
        id: 'beer',
        name: 'Beer',
        category: 'drinkable',
        tier: 'T1'
      };

      addItemToSlot(mockState, 'player1', item1, { area: 'inventory.bandolier' });
      const success = addItemToSlot(mockState, 'player1', item2, { area: 'inventory.bandolier' });

      expect(success).toBe(false);
      expect(mockState.players.player1.inventory.bandolier).toHaveLength(1);
    });
  });

  describe('enforceCapacity', () => {
    it('should drop excess items from bandolier', () => {
      const item1: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      const item2: ItemInstance = {
        instanceId: 'potion-2',
        id: 'beer',
        name: 'Beer',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player1.inventory.bandolier = [item1, item2];

      const { droppedItems, events } = enforceCapacity(mockState, 'player1', mockContext);

      expect(droppedItems).toHaveLength(1);
      expect(mockState.players.player1.inventory.bandolier).toHaveLength(1);
      expect(events).toHaveLength(2);
    });

    it('should not drop items when within capacity', () => {
      const item: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player1.inventory.bandolier = [item];

      const { droppedItems, events } = enforceCapacity(mockState, 'player1', mockContext);

      expect(droppedItems).toHaveLength(0);
      expect(events).toHaveLength(0);
    });
  });

  describe('useItem', () => {
    it('should consume healing potion and heal player', () => {
      const item: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player1.inventory.bandolier = [item];
      mockState.players.player1.hp = 2;

      const events = useItem(mockState, 'player1', 'potion-1', mockContext);

      expect(mockState.players.player1.hp).toBe(5);
      expect(mockState.players.player1.inventory.bandolier).toHaveLength(0);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ItemUsed');
    });

    it('should apply Alchemist bonus to healing', () => {
      const item: ItemInstance = {
        instanceId: 'potion-1',
        id: 'healing-potion',
        name: 'Healing Potion',
        category: 'drinkable',
        tier: 'T1'
      };

      mockState.players.player2.inventory.bandolier = [item];
      mockState.players.player2.hp = 1;

      const events = useItem(mockState, 'player2', 'potion-1', mockContext);

      expect(mockState.players.player2.hp).toBe(5);
    });

    it('should apply rage potion effect', () => {
      const item: ItemInstance = {
        instanceId: 'rage-1',
        id: 'rage-potion',
        name: 'Rage Potion',
        category: 'drinkable',
        tier: 'T2'
      };

      mockState.players.player1.inventory.bandolier = [item];

      const events = useItem(mockState, 'player1', 'rage-1', mockContext);

      expect(mockState.players.player1.activeEffects).toBeDefined();
      expect(mockState.players.player1.activeEffects).toHaveLength(1);
      expect(mockState.players.player1.activeEffects![0].type).toBe('rage-potion');
      expect(mockState.players.player1.activeEffects![0].duration).toBe('this-turn');
    });
  });
});