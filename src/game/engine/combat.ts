import type {
  PlayerId, NodeId, ItemInstance, ClassId, EnemyInstance, Tier, DieType, ItemCategory
} from '../types';
import type {
  EngineState, EngineContext, DomainEvent, InternalCombatState, FightState, DuelState,
  AttackDefenseMods, DiceRoll, InternalCombatRoundLog
} from './types';
import { generateUID } from '../util/rng';
import { ENEMIES, ITEMS } from '../data/content';

export interface CombatTarget {
  enemyIndex?: number;
  playerId?: PlayerId;
}

export interface CombatRoundResult {
  roundNumber: number;
  log: InternalCombatRoundLog;
  damageToPlayer: Map<PlayerId, number>;
  damageToEnemies: Map<number, number>;
  defeatedEnemies: number[];
  defeatedPlayers: PlayerId[];
  events: DomainEvent[];
  retreated?: PlayerId;
}

export interface CombatResolutionResult {
  finalState: InternalCombatState | null;
  events: DomainEvent[];
  winner?: PlayerId | 'enemies';
  loser?: PlayerId | 'enemies';
  loot?: ItemInstance[];
  playerMovements?: Map<PlayerId, NodeId>;
  mustSleep?: PlayerId[];
}

function getPlayerModifiers(state: EngineState, playerId: PlayerId, isPvE: boolean): AttackDefenseMods {
  const player = state.players[playerId];
  if (!player) throw new Error(`Player ${playerId} not found`);

  let attackBonus = 0;
  let defenseBonus = 0;
  let attackVsCreatures = 0;
  let defenseVsCreatures = 0;

  if (player.classId === 'class.hunter.v1' && isPvE) {
    attackVsCreatures += 1;
  }
  if (player.classId === 'class.guardian.v1' && isPvE) {
    defenseVsCreatures += 1;
  }
  if (player.classId === 'class.duelist.v1' && !isPvE) {
    attackBonus += 1;
  }

  const equipment = [...player.equipped.holdables, player.equipped.wearable].filter(Boolean) as ItemInstance[];

  for (const item of equipment) {
    const itemDef = ITEMS[item.defId];
    if (!itemDef) continue;

    if (itemDef.tags?.includes('weapon')) {
      if (itemDef.id === 'dagger') attackBonus += 1;
      else if (itemDef.id === 'lords-sword') attackBonus += 2;
      else if (itemDef.id === 'dragonfang') attackBonus += 3;
      else if (itemDef.id === 'boogey-bane' && isPvE) attackVsCreatures += 2;
    }
    if (itemDef.tags?.includes('armor') || itemDef.tags?.includes('shield')) {
      if (itemDef.id === 'wooden-shield') defenseBonus += 1;
      else if (itemDef.id === 'silver-shield') defenseBonus += 2;
      else if (itemDef.id === 'heirloom-armor') defenseBonus += 2;
      else if (itemDef.id === 'royal-aegis') defenseBonus += 3;
    }
  }

  // Check for temporary potion effects
  if (player.perTurn?.attackBonusThisTurn) {
    attackBonus += player.perTurn.attackBonusThisTurn;
  }
  if (player.perTurn?.defenseBonusThisTurn) {
    defenseBonus += player.perTurn.defenseBonusThisTurn;
  }

  return {
    attack: attackBonus + attackVsCreatures,
    defense: defenseBonus + defenseVsCreatures,
    attackVsCreatures,
    defenseVsCreatures
  };
}

function getEnemyModifiers(enemy: EnemyInstance): AttackDefenseMods {
  const enemyDef = ENEMIES[enemy.defId];
  if (!enemyDef) return { attack: 0, defense: 0 };

  return {
    attack: enemyDef.attack,
    defense: enemyDef.defense
  };
}

export function resolveCombatRound(
  state: EngineState,
  combat: InternalCombatState,
  target: CombatTarget | null,
  ctx: EngineContext
): CombatRoundResult {
  const events: DomainEvent[] = [];
  const damageToPlayer = new Map<PlayerId, number>();
  const damageToEnemies = new Map<number, number>();
  const defeatedEnemies: number[] = [];
  const defeatedPlayers: PlayerId[] = [];

  const roundNumber = combat.currentRound;

  if (combat.type === 'fight') {
    const player = state.players[combat.playerId];
    const playerMods = getPlayerModifiers(state, combat.playerId, true);

    const playerAttackRoll = ctx.rng.roll('d6', combat.playerId, `combat-${roundNumber}-player-attack`);
    const playerDefenseRoll = ctx.rng.roll('d6', combat.playerId, `combat-${roundNumber}-player-defense`);

    const playerAttackTotal = playerAttackRoll.value + playerMods.attack;
    const playerDefenseTotal = playerDefenseRoll.value + playerMods.defense;

    const enemyAttackRolls: DiceRoll[] = [];
    let targetDefenseRoll: DiceRoll | undefined;
    let targetDefenseTotal = 0;

    for (let i = 0; i < combat.enemyQueue.length; i++) {
      const enemy = combat.enemyQueue[i];
      if (enemy.currentHp <= 0) continue;

      const enemyMods = getEnemyModifiers(enemy);
      const enemyAttackRoll = ctx.rng.roll('d6', undefined, `combat-${roundNumber}-enemy-${i}-attack`);
      enemyAttackRolls.push(enemyAttackRoll);

      const enemyAttackTotal = enemyAttackRoll.value + enemyMods.attack;

      if (enemyAttackTotal > playerDefenseTotal) {
        const currentDamage = damageToPlayer.get(combat.playerId) || 0;
        damageToPlayer.set(combat.playerId, currentDamage + 1);
      }

      if (target?.enemyIndex === i) {
        targetDefenseRoll = ctx.rng.roll('d6', undefined, `combat-${roundNumber}-enemy-${i}-defense`);
        targetDefenseTotal = targetDefenseRoll.value + enemyMods.defense;

        if (playerAttackTotal > targetDefenseTotal) {
          damageToEnemies.set(i, 1);
        }
      }
    }

    const hasWardstone = player.equipped.holdables.some(h => h && ITEMS[h.defId]?.id === 'wardstone') ||
                         (player.equipped.wearable && ITEMS[player.equipped.wearable.defId]?.id === 'wardstone') ||
                         player.inventory.bandolier.some(i => i && ITEMS[i.defId]?.id === 'wardstone') ||
                         player.inventory.backpack.some(i => i && ITEMS[i.defId]?.id === 'wardstone');

    if (hasWardstone && damageToPlayer.has(combat.playerId)) {
      const damage = damageToPlayer.get(combat.playerId)!;
      if (damage > 0) {
        damageToPlayer.set(combat.playerId, damage - 1);
        events.push({
          id: generateUID(),
          ts: ctx.now(),
          type: 'ItemUsed',
          actor: combat.playerId,
          payload: { itemId: 'wardstone', effect: 'prevent-damage' }
        });
      }
    }

    for (const [enemyIdx, damage] of damageToEnemies) {
      combat.enemyQueue[enemyIdx].currentHp -= damage;
      if (combat.enemyQueue[enemyIdx].currentHp <= 0) {
        defeatedEnemies.push(enemyIdx);
      }
    }

    for (const [playerId, damage] of damageToPlayer) {
      const p = state.players[playerId];
      if (p.hp - damage <= 0) {
        defeatedPlayers.push(playerId);
      }
    }

    const targetEnemy = target?.enemyIndex !== undefined ? combat.enemyQueue[target.enemyIndex] : undefined;

    const log: InternalCombatRoundLog = {
      round: roundNumber,
      attacker: {
        playerId: combat.playerId,
        mods: playerMods
      },
      defender: targetEnemy ? {
        enemy: targetEnemy,
        mods: getEnemyModifiers(targetEnemy)
      } : {
        mods: { attack: 0, defense: 0 }
      },
      rolls: {
        attackerAttack: playerAttackRoll,
        attackerDefense: playerDefenseRoll,
        defenderDefense: targetDefenseRoll!,
      },
      damage: {
        attackerLost: damageToPlayer.get(combat.playerId) || 0,
        defenderLost: target?.enemyIndex !== undefined ? (damageToEnemies.get(target.enemyIndex) || 0) : 0
      }
    };

    combat.roundLog.push(log);

  } else if (combat.type === 'duel') {
    const attackerId = state.order.seats[state.order.currentIdx];
    const defenderId = combat.a === attackerId ? combat.b : combat.a;

    const attackerMods = getPlayerModifiers(state, attackerId, false);
    const defenderMods = getPlayerModifiers(state, defenderId, false);

    const attackerAttackRoll = ctx.rng.roll('d6', attackerId, `duel-${roundNumber}-attacker-attack`);
    const attackerDefenseRoll = ctx.rng.roll('d6', attackerId, `duel-${roundNumber}-attacker-defense`);
    const defenderAttackRoll = ctx.rng.roll('d6', defenderId, `duel-${roundNumber}-defender-attack`);
    let defenderDefenseRoll = ctx.rng.roll('d6', defenderId, `duel-${roundNumber}-defender-defense`);

    const defenderIsDuelist = state.players[defenderId].classId === 'class.duelist.v1';
    if (defenderIsDuelist && !combat.defenseRerollUsed[defenderId]) {
      const rerollChoice = Math.random() > 0.5;
      if (rerollChoice) {
        defenderDefenseRoll = ctx.rng.roll('d6', defenderId, `duel-${roundNumber}-defender-defense-reroll`);
        combat.defenseRerollUsed[defenderId] = true;
        events.push({
          id: generateUID(),
          ts: ctx.now(),
          type: 'DiceRolled',
          actor: defenderId,
          payload: { type: 'duelist-reroll', value: defenderDefenseRoll.value }
        });
      }
    }

    const attackerAttackTotal = attackerAttackRoll.value + attackerMods.attack;
    const attackerDefenseTotal = attackerDefenseRoll.value + attackerMods.defense;
    const defenderAttackTotal = defenderAttackRoll.value + defenderMods.attack;
    const defenderDefenseTotal = defenderDefenseRoll.value + defenderMods.defense;

    if (attackerAttackTotal > defenderDefenseTotal) {
      damageToPlayer.set(defenderId, 1);
    }

    if (defenderAttackTotal > attackerDefenseTotal) {
      damageToPlayer.set(attackerId, 1);
    }

    for (const playerId of [attackerId, defenderId]) {
      const player = state.players[playerId];
      const hasWardstone = player.equipped.holdables.some(h => h && ITEMS[h.defId]?.id === 'wardstone') ||
                           (player.equipped.wearable && ITEMS[player.equipped.wearable.defId]?.id === 'wardstone') ||
                           player.inventory.bandolier.some(i => i && ITEMS[i.defId]?.id === 'wardstone') ||
                           player.inventory.backpack.some(i => i && ITEMS[i.defId]?.id === 'wardstone');

      if (hasWardstone && damageToPlayer.has(playerId)) {
        const damage = damageToPlayer.get(playerId)!;
        if (damage > 0) {
          damageToPlayer.set(playerId, damage - 1);
          events.push({
            id: generateUID(),
            ts: ctx.now(),
            type: 'ItemUsed',
            actor: playerId,
            payload: { itemId: 'wardstone', effect: 'prevent-damage' }
          });
        }
      }
    }

    for (const [playerId, damage] of damageToPlayer) {
      const p = state.players[playerId];
      if (p.hp - damage <= 0) {
        defeatedPlayers.push(playerId);
      }
    }

    const log: InternalCombatRoundLog = {
      round: roundNumber,
      attacker: {
        playerId: attackerId,
        mods: attackerMods
      },
      defender: {
        playerId: defenderId,
        mods: defenderMods
      },
      rolls: {
        attackerAttack: attackerAttackRoll,
        attackerDefense: attackerDefenseRoll,
        defenderAttack: defenderAttackRoll,
        defenderDefense: defenderDefenseRoll
      },
      damage: {
        attackerLost: damageToPlayer.get(attackerId) || 0,
        defenderLost: damageToPlayer.get(defenderId) || 0
      }
    };

    combat.roundLog.push(log);
  }

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'CombatRoundResolved',
    payload: {
      round: roundNumber,
      damageDealt: Object.fromEntries(damageToPlayer),
      enemiesDefeated: defeatedEnemies
    }
  });

  return {
    roundNumber,
    log: combat.roundLog[combat.roundLog.length - 1],
    damageToPlayer,
    damageToEnemies,
    defeatedEnemies,
    defeatedPlayers,
    events
  };
}

export function initiateCombat(
  state: EngineState,
  type: 'fight' | 'duel',
  participants: { playerId?: PlayerId; enemyQueue?: EnemyInstance[]; duelPlayers?: [PlayerId, PlayerId] },
  ctx: EngineContext
): { combat: InternalCombatState; events: DomainEvent[] } {
  const events: DomainEvent[] = [];

  if (type === 'fight' && participants.playerId && participants.enemyQueue) {
    const player = state.players[participants.playerId];
    const combat: FightState = {
      type: 'fight',
      tileId: player.position,
      playerId: participants.playerId,
      enemyQueue: participants.enemyQueue.map(e => ({ ...e })),
      currentRound: 1,
      roundLog: [],
      retreatHistorySnapshot: player.movementHistory?.forwardThisTurn || []
    };

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'CombatStarted',
      actor: participants.playerId,
      payload: {
        type: 'fight',
        enemies: combat.enemyQueue.map(e => ({ id: e.defId, hp: e.currentHp }))
      }
    });

    return { combat, events };
  } else if (type === 'duel' && participants.duelPlayers) {
    const [a, b] = participants.duelPlayers;
    const combat: DuelState = {
      type: 'duel',
      a,
      b,
      currentRound: 1,
      roundLog: [],
      defenseRerollUsed: {},
      offeredBy: a
    };

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DuelStarted',
      actor: a,
      payload: { participants: [a, b] }
    });

    return { combat, events };
  }

  throw new Error('Invalid combat initiation parameters');
}

export function handleRetreat(
  state: EngineState,
  combat: InternalCombatState,
  retreatingPlayer: PlayerId,
  ctx: EngineContext
): { movements: Map<PlayerId, NodeId>; events: DomainEvent[] } {
  const events: DomainEvent[] = [];
  const movements = new Map<PlayerId, NodeId>();

  const player = state.players[retreatingPlayer];
  const history = player.movementHistory?.forwardThisTurn || [];
  const retreatSteps = 6;

  let currentPos = player.position;
  for (let i = 0; i < retreatSteps && i < history.length; i++) {
    currentPos = history[history.length - 1 - i];
  }

  movements.set(retreatingPlayer, currentPos);

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'RetreatExecuted',
    actor: retreatingPlayer,
    payload: {
      from: player.position,
      to: currentPos,
      retreatDistance: Math.min(retreatSteps, history.length)
    }
  });

  return { movements, events };
}

export function checkCombatEnd(
  state: EngineState,
  combat: InternalCombatState,
  lastRoundResult: CombatRoundResult
): CombatResolutionResult {
  const events: DomainEvent[] = [];
  const result: CombatResolutionResult = {
    finalState: combat,
    events
  };

  if (combat.type === 'fight') {
    const allEnemiesDead = combat.enemyQueue.every(e => e.currentHp <= 0);
    const playerDead = state.players[combat.playerId].hp <= 0;

    if (playerDead) {
      result.loser = combat.playerId;
      result.winner = 'enemies';
      result.mustSleep = [combat.playerId];

      const player = state.players[combat.playerId];
      const board = state.board;
      // Move player back one node if defeated
      const graph = board.graph;
      const prevNodes = graph.reverseAdj?.get(player.position) || [];
      if (prevNodes.length > 0) {
        const moveBack = prevNodes[0];
        result.playerMovements = new Map([[combat.playerId, moveBack]]);
      }

      events.push({
        id: generateUID(),
        ts: Date.now(),
        type: 'FightEnded',
        actor: combat.playerId,
        payload: { result: 'defeat' }
      });

      result.finalState = null;
    } else if (allEnemiesDead) {
      result.winner = combat.playerId;
      result.loser = 'enemies';

      const loot: ItemInstance[] = [];
      for (const enemy of combat.enemyQueue) {
        const enemyDef = ENEMIES[enemy.defId];
        if (!enemyDef) continue;

        const roll = Math.random();
        let treasureTier: Tier = 1;

        if (enemyDef.tier === 1 && roll < 0.5) {
          treasureTier = 1;
          loot.push({
            instanceId: generateUID(),
            defId: `t1-treasure-${Math.floor(Math.random() * 10)}`
          });
        } else if (enemyDef.tier === 2) {
          if (roll < 0.7) treasureTier = 2;
          else if (roll < 0.85) treasureTier = 1;

          loot.push({
            instanceId: generateUID(),
            defId: `t${treasureTier}-treasure-${Math.floor(Math.random() * 10)}`
          });
        } else if (enemyDef.tier === 3) {
          if (roll < 0.8) treasureTier = 3;
          else treasureTier = 2;

          loot.push({
            instanceId: generateUID(),
            defId: `t${treasureTier}-treasure-${Math.floor(Math.random() * 10)}`
          });
        }
      }

      if (state.players[combat.playerId].classId === 'class.raider.v1') {
        const raiderRoll = Math.random();
        if (raiderRoll > 0.67) {
          const enemy = combat.enemyQueue[0];
          const enemyDef = enemy ? ENEMIES[enemy.defId] : null;
          const enemyTier = enemyDef ? enemyDef.tier : 1;
          loot.push({
            instanceId: generateUID(),
            defId: `raider-bonus-t${enemyTier}`
          });
        }
      }

      result.loot = loot;

      events.push({
        id: generateUID(),
        ts: Date.now(),
        type: 'FightEnded',
        actor: combat.playerId,
        payload: { result: 'victory', loot: loot.map(l => l.defId) }
      });

      result.finalState = null;
    }
  } else if (combat.type === 'duel') {
    const playerADead = state.players[combat.a].hp <= 0;
    const playerBDead = state.players[combat.b].hp <= 0;

    if (playerADead && playerBDead) {
      result.mustSleep = [combat.a, combat.b];

      events.push({
        id: generateUID(),
        ts: Date.now(),
        type: 'DuelEnded',
        actor: combat.offeredBy,
        payload: { result: 'draw', participants: [combat.a, combat.b] }
      });

      result.finalState = null;
    } else if (playerADead) {
      result.winner = combat.b;
      result.loser = combat.a;
      result.mustSleep = [combat.a];

      events.push({
        id: generateUID(),
        ts: Date.now(),
        type: 'DuelEnded',
        actor: combat.offeredBy,
        payload: { result: 'victory', winner: combat.b, loser: combat.a }
      });

      result.finalState = null;
    } else if (playerBDead) {
      result.winner = combat.a;
      result.loser = combat.b;
      result.mustSleep = [combat.b];

      events.push({
        id: generateUID(),
        ts: Date.now(),
        type: 'DuelEnded',
        actor: combat.offeredBy,
        payload: { result: 'victory', winner: combat.a, loser: combat.b }
      });

      result.finalState = null;
    }

    if (result.winner && state.players[result.winner].classId === 'class.raider.v1') {
      const raiderRoll = Math.random();
      if (raiderRoll > 0.67) {
        result.loot = [{
          instanceId: generateUID(),
          defId: 'raider-duel-bonus'
        }];
      }
    }
  }

  result.events = [...result.events, ...events];
  return result;
}

export function applyDamage(
  state: EngineState,
  damageMap: Map<PlayerId, number>,
  enemyDamage: Map<number, number>,
  combat: InternalCombatState
): void {
  for (const [playerId, damage] of damageMap) {
    const player = state.players[playerId];
    if (player) {
      player.hp = Math.max(0, player.hp - damage);
    }
  }

  if (combat.type === 'fight') {
    for (const [enemyIdx, damage] of enemyDamage) {
      const enemy = combat.enemyQueue[enemyIdx];
      if (enemy) {
        enemy.currentHp = Math.max(0, enemy.currentHp - damage);
      }
    }
  }
}