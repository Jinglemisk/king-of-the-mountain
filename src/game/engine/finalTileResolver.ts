import type {
  EngineState, EngineContext, DomainEvent, DuelState, EngineUpdate
} from './types';
import type { PlayerId, NodeId } from '../types';
import type { CombatTarget } from './combat';
import { generateUID } from '../util/rng';
import { initiateCombat, resolveCombatRound, applyDamage } from './combat';

export interface FinalTileBracket {
  participants: PlayerId[];
  currentMatch: [PlayerId, PlayerId] | null;
  matchHistory: Array<{
    participants: [PlayerId, PlayerId];
    winner: PlayerId | 'draw';
  }>;
  winner: PlayerId | null;
}

export function checkFinalTileArrival(
  state: EngineState,
  movedPlayers: PlayerId[]
): PlayerId[] {
  const finalNode = Object.values(state.board.nodes).find(n => n.type === 'final');
  if (!finalNode) return [];

  const arrivedPlayers = movedPlayers.filter(pid =>
    state.players[pid].position === finalNode.id
  );

  return arrivedPlayers;
}

export function initiateFinalTileBracket(
  state: EngineState,
  participants: PlayerId[],
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (participants.length === 0) {
    return { state, events };
  }

  if (participants.length === 1) {
    const winner = participants[0];
    const newState = { ...state };
    newState.winner = winner;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'GameEnded',
      payload: {
        winner,
        finalStandings: state.turnOrder.map((pid, idx) => ({
          playerId: pid,
          position: idx + 1
        }))
      }
    });

    return { state: newState, events };
  }

  const newState = { ...state };

  const sortedParticipants = [...participants].sort((a, b) => {
    const aIndex = state.turnOrder.indexOf(a);
    const bIndex = state.turnOrder.indexOf(b);
    return aIndex - bIndex;
  });

  newState.finalTileBracket = {
    participants: sortedParticipants,
    currentMatch: null,
    matchHistory: [],
    winner: null
  };

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'FinalTieBreakerStarted',
    payload: {
      participants: sortedParticipants
    }
  });

  const bracketState = runNextBracketMatch(newState, ctx);

  return {
    state: bracketState.state,
    events: [...events, ...bracketState.events]
  };
}

export function runNextBracketMatch(
  state: EngineState,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.finalTileBracket) {
    return { state, events };
  }

  const bracket = state.finalTileBracket;
  const remainingPlayers = bracket.participants.filter(pid => {
    const losses = bracket.matchHistory.filter(m =>
      (m.participants[0] === pid || m.participants[1] === pid) &&
      m.winner !== pid && m.winner !== 'draw'
    ).length;
    return losses === 0;
  });

  if (remainingPlayers.length === 0) {
    return { state, events };
  }

  if (remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    const newState = { ...state };
    newState.winner = winner;
    newState.finalTileBracket!.winner = winner;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'FinalTieBreakerEnded',
      payload: {
        winner,
        bracket: bracket.matchHistory
      }
    });

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'GameEnded',
      payload: {
        winner,
        finalStandings: state.turnOrder.map((pid, idx) => ({
          playerId: pid,
          position: pid === winner ? 1 : idx + 2
        }))
      }
    });

    return { state: newState, events };
  }

  const nextPair: [PlayerId, PlayerId] = [remainingPlayers[0], remainingPlayers[1]];

  const newState = { ...state };
  newState.finalTileBracket!.currentMatch = nextPair;

  const player1HP = newState.players[nextPair[0]].maxHp || 5;
  const player2HP = newState.players[nextPair[1]].maxHp || 5;
  newState.players[nextPair[0]].hp = player1HP;
  newState.players[nextPair[1]].hp = player2HP;

  const { combat, events: combatEvents } = initiateCombat(
    newState,
    'duel',
    { duelPlayers: nextPair },
    ctx
  );

  const duelCombat = combat as DuelState;
  duelCombat.isFinalTileBracket = true;

  newState.combatInternal = duelCombat;

  events.push(...combatEvents);

  return { state: newState, events };
}

export function resolveBracketMatch(
  state: EngineState,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  if (!state.combatInternal || state.combatInternal.type !== 'duel') {
    return { state, events };
  }

  const duel = state.combatInternal as DuelState & { isFinalTileBracket?: boolean };
  if (!duel.isFinalTileBracket) {
    return { state, events };
  }

  const newState = { ...state };
  const maxRounds = 10;
  let winner: PlayerId | null = null;

  for (let round = 0; round < maxRounds && !winner; round++) {
    const roundResult = resolveCombatRound(
      newState,
      duel,
      null,
      ctx
    );

    applyDamage(
      newState,
      roundResult.damageToPlayer,
      new Map(),
      duel
    );

    events.push(...roundResult.events);

    const playerAHP = newState.players[duel.a].hp;
    const playerBHP = newState.players[duel.b].hp;

    if (playerAHP <= 0 && playerBHP <= 0) {
      const player1HP = newState.players[duel.a].maxHp || 5;
      const player2HP = newState.players[duel.b].maxHp || 5;
      newState.players[duel.a].hp = player1HP;
      newState.players[duel.b].hp = player2HP;

      duel.currentRound = 1;
      duel.roundLog = [];
      duel.defenseRerollUsed = {};

      events.push({
        id: generateUID(),
        ts: ctx.now(),
        type: 'DuelEnded',
        payload: {
          result: 'draw-restart',
          participants: [duel.a, duel.b],
          reason: 'final-tile-bracket'
        }
      });

    } else if (playerAHP <= 0) {
      winner = duel.b;
    } else if (playerBHP <= 0) {
      winner = duel.a;
    } else {
      duel.currentRound++;
    }
  }

  if (winner) {
    const loser = winner === duel.a ? duel.b : duel.a;

    newState.finalTileBracket!.matchHistory.push({
      participants: [duel.a, duel.b],
      winner
    });

    newState.combatInternal = null;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DuelEnded',
      payload: {
        result: 'victory',
        winner,
        loser,
        bracketMatch: true
      }
    });

    const player1HP = newState.players[duel.a].maxHp || 5;
    const player2HP = newState.players[duel.b].maxHp || 5;
    newState.players[duel.a].hp = player1HP;
    newState.players[duel.b].hp = player2HP;

    const nextMatch = runNextBracketMatch(newState, ctx);
    return {
      state: nextMatch.state,
      events: [...events, ...nextMatch.events]
    };
  }

  return { state: newState, events };
}

export function handleFinalTileVictory(
  state: EngineState,
  winnerId: PlayerId,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];
  const newState = { ...state };

  newState.winner = winnerId;

  const finalStandings = state.turnOrder.map((pid, idx) => ({
    playerId: pid,
    position: pid === winnerId ? 1 : idx + 2,
    finalTile: state.players[pid].position,
    hp: state.players[pid].hp,
    items: [
      ...state.players[pid].equipped.holdables.filter(Boolean),
      state.players[pid].equipped.wearable
    ].filter(Boolean).length
  }));

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'GameEnded',
    payload: {
      winner: winnerId,
      finalStandings,
      totalTurns: Math.floor(state.turnCounter / state.turnOrder.length),
      gameTime: ctx.now() - state.startTime
    }
  });

  return { state: newState, events };
}