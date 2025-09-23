// /src/game/util/rng.ts
// RNG implementation with deterministic seeded mode and crypto mode

import type { RNGState, PlayerId, DieType, RngAuditEntry } from '../types';
import type { RNG, DiceRoll } from '../engine/types';

export type RNGMode = 'crypto' | 'seeded';
export type RNGTag = string;

export interface RNGContext {
  gameId?: string;
  actionId?: string;
  turn?: number;
  actorUid?: PlayerId;
  phase?: string;
  tileId?: number;
  combatId?: string;
  duelId?: string;
  deckId?: string;
  enemyTier?: number;
  reason?: string;
}

export interface RNGOptions {
  mode: RNGMode;
  seed?: string;
  audit?: (entry: RngAuditEntry) => void;
}

interface PRNG {
  next(): number; // Returns uint32
}

// cyrb128 hash function to generate 4 x 32-bit seeds from string
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

// sfc32 PRNG - fast, stable, deterministic
function sfc32(a: number, b: number, c: number, d: number): PRNG {
  return {
    next(): number {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      const t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      c = c + d | 0;
      return (t >>> 0);
    }
  };
}

class CryptoRNG implements PRNG {
  next(): number {
    const buffer = new Uint32Array(1);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(buffer);
    } else {
      // Node.js environment
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(4);
      buffer[0] = bytes.readUInt32BE(0);
    }
    return buffer[0];
  }
}

export class RNGImpl implements RNG {
  state: RNGState;
  private prng: PRNG;
  private audit?: (entry: RngAuditEntry) => void;

  constructor(state: RNGState, options: RNGOptions) {
    this.state = state;
    this.audit = options.audit;

    if (options.mode === 'seeded' && options.seed) {
      const seeds = cyrb128(options.seed);
      this.prng = sfc32(seeds[0], seeds[1], seeds[2], seeds[3]);
    } else {
      this.prng = new CryptoRNG();
    }
  }

  private nextUint32(tag?: RNGTag, ctx?: RNGContext): number {
    const value = this.prng.next();
    this.state.counter++;

    if (this.audit) {
      const entry: RngAuditEntry = {
        id: `rng_${this.state.counter}`,
        ts: Date.now(),
        actor: ctx?.actorUid,
        kind: 'd6', // Will be overridden by specific methods
        details: { tag, ctx, value }
      };
      this.audit(entry);
    }

    return value;
  }

  private uniformInt(minInclusive: number, maxInclusive: number, tag?: RNGTag, ctx?: RNGContext): number {
    const n = maxInclusive - minInclusive + 1;
    if (n <= 0) throw new Error('Invalid range for uniformInt');

    const maxU32 = 0x100000000; // 2^32
    const limit = Math.floor(maxU32 / n) * n;

    let u: number;
    do {
      u = this.nextUint32(tag, ctx);
    } while (u >= limit);

    return minInclusive + (u % n);
  }

  roll(die: DieType, actor?: PlayerId, requestId?: string): DiceRoll {
    const sides = die === 'd4' ? 4 : 6;
    const value = this.uniformInt(1, sides, `dice.${die}`, { actorUid: actor });

    const roll: DiceRoll = {
      id: `roll_${this.state.counter}`,
      die,
      value,
      actor
    };

    if (this.audit) {
      const entry: RngAuditEntry = {
        id: roll.id,
        ts: Date.now(),
        actor,
        kind: die,
        requestId,
        details: { value }
      };
      this.state.audit.push(entry);
    }

    return roll;
  }

  shuffle<T>(arr: ReadonlyArray<T>, requestId?: string): T[] {
    const result = [...arr];

    for (let i = result.length - 1; i > 0; i--) {
      const j = this.uniformInt(0, i, 'shuffle', { reason: 'Fisher-Yates' });
      [result[i], result[j]] = [result[j], result[i]];
    }

    if (this.audit) {
      const entry: RngAuditEntry = {
        id: `shuffle_${this.state.counter}`,
        ts: Date.now(),
        kind: 'shuffle',
        requestId,
        details: {
          size: arr.length,
          headPreview: result.slice(0, 3)
        }
      };
      this.state.audit.push(entry);
    }

    return result;
  }

  weightedPick<T>(
    items: ReadonlyArray<T>,
    weights: ReadonlyArray<number>,
    requestId?: string
  ): { index: number; item: T } {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have same length');
    }

    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) throw new Error('Weights sum must be positive');

    const r = this.uniformInt(0, sum - 1, 'weightedPick');

    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += weights[i];
      if (r < acc) {
        if (this.audit) {
          const entry: RngAuditEntry = {
            id: `weighted_${this.state.counter}`,
            ts: Date.now(),
            kind: 'weightedPick',
            requestId,
            details: { weights, r, index: i }
          };
          this.state.audit.push(entry);
        }
        return { index: i, item: items[i] };
      }
    }

    // Should not reach here, but return last item as fallback
    const lastIdx = items.length - 1;
    return { index: lastIdx, item: items[lastIdx] };
  }
}

export function createRNG(state: RNGState, options?: Partial<RNGOptions>): RNG {
  const fullOptions: RNGOptions = {
    mode: state.seed ? 'seeded' : 'crypto',
    seed: state.seed,
    ...options
  };

  return new RNGImpl(state, fullOptions);
}

// Helper to create initial RNG state
export function createRNGState(seed?: string): RNGState {
  return {
    seed,
    counter: 0,
    audit: []
  };
}

// Helper to generate unique IDs
let uidCounter = 0;
export function generateUID(): string {
  uidCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}-${uidCounter}`;
}

// Simple helper for rolling a D6 (used in gameService for turn order)
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}