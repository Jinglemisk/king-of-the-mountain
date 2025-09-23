import {
  EngineState, EngineContext, EngineUpdate, DomainEvent,
  OfferDuelAction, AcceptDuelAction, DeclineDuelAction, RetreatAction,
  UseItemAction, InvalidActionError
} from '../types';
import {
  initiateCombat, resolveCombatRound, handleRetreat, checkCombatEnd,
  applyDamage, CombatTarget
} from '../combat';
import { generateUID } from '../../util/rng';
import { EnemyInstance, PlayerId } from '../../types';

export function handleOfferDuel(
  state: EngineState,
  action: OfferDuelAction,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (state.phase !== 'preDuel') {
    throw new InvalidActionError('Can only offer duels in preDuel phase', action);
  }

  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid) {
    throw new InvalidActionError('Not your turn', action);
  }

  const target = state.players[action.targetUid];
  if (!target) {
    throw new InvalidActionError('Target player not found', action);
  }

  if (target.position !== state.players[currentPlayer].position) {
    throw new InvalidActionError('Target must be on same tile', action);
  }

  const tile = state.board.nodes[target.position];
  if (tile.type === 'sanctuary') {
    throw new InvalidActionError('Cannot duel on Sanctuary tiles', action);
  }

  const newState = { ...state };

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'DuelOffered',
    actor: action.uid,
    payload: {
      offerer: action.uid,
      target: action.targetUid,
      tile: target.position
    }
  });

  newState.pendingDuelOffer = {
    from: action.uid,
    to: action.targetUid
  };

  return { state: newState, events };
}

export function handleAcceptDuel(
  state: EngineState,
  action: AcceptDuelAction,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.pendingDuelOffer) {
    throw new InvalidActionError('No pending duel offer', action);
  }

  if (state.pendingDuelOffer.to !== action.uid) {
    throw new InvalidActionError('Duel was not offered to you', action);
  }

  const newState = { ...state };

  const { combat, events: combatEvents } = initiateCombat(
    newState,
    'duel',
    { duelPlayers: [state.pendingDuelOffer.from, state.pendingDuelOffer.to] },
    ctx
  );

  newState.combatInternal = combat;
  newState.pendingDuelOffer = undefined;

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'DuelAccepted',
    actor: action.uid,
    payload: {
      accepter: action.uid,
      offerer: state.pendingDuelOffer.from
    }
  });

  events.push(...combatEvents);

  return { state: newState, events };
}

export function handleDeclineDuel(
  state: EngineState,
  action: DeclineDuelAction,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.pendingDuelOffer) {
    throw new InvalidActionError('No pending duel offer', action);
  }

  if (state.pendingDuelOffer.to !== action.uid) {
    throw new InvalidActionError('Duel was not offered to you', action);
  }

  const newState = { ...state };
  newState.pendingDuelOffer = undefined;

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'DuelDeclined',
    actor: action.uid,
    payload: {
      decliner: action.uid,
      offerer: state.pendingDuelOffer.from
    }
  });

  return { state: newState, events };
}

export function handleRetreatAction(
  state: EngineState,
  action: RetreatAction,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.combatInternal) {
    throw new InvalidActionError('No active combat to retreat from', action);
  }

  const isParticipant = state.combatInternal.type === 'fight'
    ? state.combatInternal.playerId === action.uid
    : state.combatInternal.a === action.uid || state.combatInternal.b === action.uid;

  if (!isParticipant) {
    throw new InvalidActionError('You are not a participant in this combat', action);
  }

  const newState = { ...state };

  const { movements, events: retreatEvents } = handleRetreat(
    newState,
    state.combatInternal,
    action.uid,
    ctx
  );

  for (const [playerId, newPosition] of movements) {
    newState.players[playerId].position = newPosition;
    newState.players[playerId].pendingTileResolution = true;
  }

  newState.combatInternal = null;

  if (state.combatInternal.type === 'fight') {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'FightEnded',
      actor: action.uid,
      payload: { result: 'retreat' }
    });
  } else {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DuelEnded',
      actor: action.uid,
      payload: { result: 'retreat', retreater: action.uid }
    });
  }

  events.push(...retreatEvents);

  return { state: newState, events };
}

export function handleCombatTargeting(
  state: EngineState,
  playerId: PlayerId,
  targetIndex: number,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.combatInternal || state.combatInternal.type !== 'fight') {
    throw new Error('No active fight');
  }

  if (state.combatInternal.playerId !== playerId) {
    throw new Error('Not your fight');
  }

  const combat = state.combatInternal;
  if (targetIndex < 0 || targetIndex >= combat.enemyQueue.length) {
    throw new Error('Invalid target index');
  }

  if (combat.enemyQueue[targetIndex].hp <= 0) {
    throw new Error('Target already defeated');
  }

  const newState = { ...state };
  const target: CombatTarget = { enemyIndex: targetIndex };

  const roundResult = resolveCombatRound(newState, combat, target, ctx);

  applyDamage(newState, roundResult.damageToPlayer, roundResult.damageToEnemies, combat);

  combat.currentRound++;

  const endResult = checkCombatEnd(newState, combat, roundResult);

  if (endResult.finalState === null) {
    newState.combatInternal = null;

    if (endResult.playerMovements) {
      for (const [pid, pos] of endResult.playerMovements) {
        newState.players[pid].position = pos;
      }
    }

    if (endResult.mustSleep) {
      for (const pid of endResult.mustSleep) {
        newState.players[pid].mustSleep = true;
      }
    }

    if (endResult.loot) {
      const winnerId = endResult.winner as PlayerId;
      if (winnerId && newState.players[winnerId]) {
        for (const item of endResult.loot) {
          newState.players[winnerId].inventory.backpack.push(item);
        }
      }
    }
  }

  events.push(...roundResult.events);
  events.push(...endResult.events);

  return { state: newState, events };
}

export function startCombatWithEnemies(
  state: EngineState,
  playerId: PlayerId,
  enemies: EnemyInstance[],
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  const newState = { ...state };

  const { combat, events: combatEvents } = initiateCombat(
    newState,
    'fight',
    { playerId, enemyQueue: enemies },
    ctx
  );

  newState.combatInternal = combat;

  events.push(...combatEvents);

  return { state: newState, events };
}

export function handleMonkCancel(
  state: EngineState,
  playerId: PlayerId,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  const player = state.players[playerId];
  if (player.classId !== 'monk') {
    throw new Error('Only Monk can use this ability');
  }

  if (player.monkCancelUsed) {
    throw new Error('Monk cancel already used this game');
  }

  if (!state.pendingDuelOffer || state.pendingDuelOffer.to !== playerId) {
    throw new Error('No duel offer to cancel');
  }

  const newState = { ...state };

  const roll = ctx.rng.roll('d6', playerId, 'monk-cancel');

  if (roll.value >= 5) {
    newState.pendingDuelOffer = undefined;
    newState.players[playerId].monkCancelUsed = true;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DuelCancelled',
      actor: playerId,
      payload: {
        reason: 'monk-cancel',
        roll: roll.value
      }
    });
  } else {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DiceRolled',
      actor: playerId,
      payload: {
        purpose: 'monk-cancel-failed',
        roll: roll.value
      }
    });
  }

  return { state: newState, events };
}

export function handleSmokeBomb(
  state: EngineState,
  playerId: PlayerId,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  const player = state.players[playerId];
  const hasSmokeBomb = player.inventory.bandolier.some(i => i?.id === 'smoke-bomb') ||
                        player.inventory.backpack.some(i => i?.id === 'smoke-bomb');

  if (!hasSmokeBomb) {
    throw new Error('No Smoke Bomb in inventory');
  }

  if (!state.pendingDuelOffer || state.pendingDuelOffer.to !== playerId) {
    throw new Error('No duel offer to block');
  }

  const newState = { ...state };

  newState.pendingDuelOffer = undefined;

  const smokeBombIndex = player.inventory.bandolier.findIndex(i => i?.id === 'smoke-bomb');
  if (smokeBombIndex >= 0) {
    player.inventory.bandolier.splice(smokeBombIndex, 1);
  } else {
    const backpackIndex = player.inventory.backpack.findIndex(i => i?.id === 'smoke-bomb');
    if (backpackIndex >= 0) {
      player.inventory.backpack.splice(backpackIndex, 1);
    }
  }

  player.activeEffects = player.activeEffects || [];
  player.activeEffects.push({
    type: 'smoke-bomb',
    duration: 'this-turn',
    source: 'item'
  });

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ItemUsed',
    actor: playerId,
    payload: {
      itemId: 'smoke-bomb',
      effect: 'block-duels'
    }
  });

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'DuelCancelled',
    actor: playerId,
    payload: {
      reason: 'smoke-bomb'
    }
  });

  return { state: newState, events };
}