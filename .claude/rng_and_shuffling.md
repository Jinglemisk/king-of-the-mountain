docs/RNG_AND_SHUFFLING.md

RNG and Shuffling Spec v1.0

Goals
- Every random decision comes from a single, auditable API.
- Results are deterministic when replayed (with a seed) and identical across clients because results are committed to state/logs.
- No Math.random anywhere in the codebase.
- Stable entropy consumption order so a given sequence of actions yields the same outcomes.

Modes and sources
- Production mode
  - Source: window.crypto.getRandomValues(Uint32Array(1)).
  - Used whenever game.rng.seed is absent (or rng.mode === "crypto").
  - All RNG results are committed to game state or log so all clients converge.
- Dev/test mode
  - Deterministic PRNG used for replays and unit tests.
  - Algorithm: sfc32 seeded by a 128-bit cyrb128 hash of the seed string (fast, stable).
  - Used when game.rng.seed is set (or rng.mode === "seeded").
  - Never use seeded mode for “real” games.

RNG state stored in Game doc
- games/{gameId}.rng
  - mode: "crypto" | "seeded"
  - seed?: string (only when mode === "seeded")
  - seq: number (monotonic sequence number for audit entries; starts at 0)
  - auditEnabled?: boolean (default false; when true, engine records rngAudit entries)
- games/{gameId}.rngAudit (optional subcollection if auditEnabled is true, or ring buffer on game doc)
  - seq: number (monotonic)
  - ts: server timestamp (or client time if offline)
  - tag: string (see tags below)
  - ctx: object (see context fields below)
  - kind: "dice" | "shuffle" | "weighted" | "sample"
  - data: object (payload; see per-kind)

Never block game on the audit. The source of truth for outcomes is the state mutation and/or the game log events, not rngAudit.

Core API contract (TypeScript)
Place in /src/game/util/rng.ts (exported types in /src/game/types.ts as needed).

Types
- RNGTag: string
  - Naming: dot-separated, kebab-friendly: e.g., "turnOrder.roll", "deck.initShuffle.treasure.t1"
- RNGContext (suggested shape; partials allowed)
  - { gameId, actionId, turn, actorUid, phase, tileId, combatId, duelId, deckId, enemyTier, reason }
- DiceRoll
  - { sides: number, value: number, modifiers?: number[], total?: number } // modifiers/total are for logs; the RNG only creates value
- WeightedItem<T>
  - { item: T, weight: number } // weight > 0, finite

Interfaces
- interface RNG {
    readonly mode: "crypto" | "seeded";
    readonly seed?: string;
    nextUint32(tag?: RNGTag, ctx?: RNGContext): number; // raw 32-bit
    uniformInt(minInclusive: number, maxInclusive: number, tag?: RNGTag, ctx?: RNGContext): number; // unbiased
    float01(tag?: RNGTag, ctx?: RNGContext): number; // [0,1)
    dice(sides: number, tag: RNGTag, ctx?: RNGContext): DiceRoll; // 1..sides
    chooseOne<T>(arr: readonly T[], tag: RNGTag, ctx?: RNGContext): T; // uniform
    weightedPick<T>(items: readonly WeightedItem<T>[], tag: RNGTag, ctx?: RNGContext): { index: number, item: T, r: number }; // r is the 0..sum draw
    shuffleInPlace<T>(arr: T[], tag: RNGTag, ctx?: RNGContext): void; // Fisher–Yates, unbiased
  }

Factory
- function createRNG(opts: { mode: "crypto" | "seeded", seed?: string, audit?: (entry) => void }): RNG
  - crypto: uses getRandomValues
  - seeded: uses sfc32(cyrb128(seed))
  - audit hook is called with { seq, tag, ctx, kind, data } after each consumption
- Never instantiate RNG directly in code that mutates state. Inject it via engine reducer / command handler parameters so tests can substitute seeded RNG.

Implementation notes
- unbiased uniformInt: use rejection sampling
  - n = maxInclusive - minInclusive + 1
  - limit = floor((2^32) / n) * n
  - draw u32 until u < limit, then return minInclusive + (u % n)
- shuffle: Fisher–Yates from end to start; each swap index j chosen by uniformInt(0, i)
- sfc32 + cyrb128 reference:
  - Use the standard cyrb128 string hash to get 4 x 32-bit seeds, feed to sfc32 (documented widely).
  - Make sure tests pin the exact code to avoid drift.

RNG tags and contexts (canonical list)
Use these tag names for audit/log correlation.

- Game setup
  - "turnOrder.roll"
  - "turnOrder.tieBreak.reroll"
  - "deck.initShuffle.treasure.t1"
  - "deck.initShuffle.treasure.t2"
  - "deck.initShuffle.treasure.t3"
  - "deck.initShuffle.chance"
  - "deck.initShuffle.enemy.t1"
  - "deck.initShuffle.enemy.t2"
  - "deck.initShuffle.enemy.t3"
- Per-turn
  - "move.roll"
  - "chance.earthquake.backRoll" // per player
  - "monk.cancel.roll" // once per game per Monk
- Combat and duels
  - "combat.player.attack"
  - "combat.player.defense"
  - "combat.enemy.attack"
  - "combat.enemy.defense"
  - "duel.player.attack"
  - "duel.player.defense"
  - "duel.defense.reroll" // Duelist perk
- Enemies and loot
  - "enemy.composition.pick.t1|t2|t3" // ctx: { tileId, enemyTier }
  - "loot.drop.roll.t1|t2|t3" // ctx: { enemyTier }
- Tie-breakers and misc
  - "tiebreak.nearest.pick" // ctx: { reason: "mysticWave" | "nefariousSpirit" }
  - "random.sample" // fallback tag when no specific tag exists
- Deck reshuffles
  - "deck.reshuffle.treasure.t1" (and others)
- Optional
  - "test.only" // for fixtures

Entropy consumption order (must-implement)
The engine must call RNG in this exact order within each reducer to stay replay-safe and cross-client-deterministic.

Game start (StartGame action)
1) Shuffle decks (in this order):
   - treasure.t1 → treasure.t2 → treasure.t3 → chance → enemy.t1 → enemy.t2 → enemy.t3
   - Each is a single shuffle call with its own tag.
   - Persist the deck arrays to games/{gameId}.decks.*
2) Determine turn order:
   - Gather seated players sorted by seatIndex ascending.
   - Each rolls d6 (tag: "turnOrder.roll", ctx.actorUid).
   - If multiple highest are tied: only the tied group re-roll in seatIndex order with tag "turnOrder.tieBreak.reroll"; repeat until unique order.
   - Persist final seat order as the fixed turn order for the match and log rolls.

On current player’s turn
- Step 2 (manage): no RNG.
- Step 3 (preDuel): duel offers may cause Monk or Smoke Bomb
  - If Monk attempts cancel: roll d6 (tag "monk.cancel.roll", ctx.duelId); on 5–6 cancel.
- Step 4 (moveOrSleep):
  - If Move: roll d4 (tag "move.roll", ctx.turn, ctx.actorUid).
  - Effects that instruct another immediate movement roll (e.g., Chance: Vital Energy) consume additional d4s in the sequence they are resolved.
- Step 5 (resolveTile):
  - Drawing from a deck uses the top card only (no RNG at draw time because the deck is already shuffled).
  - Enemy tile: pick composition with weightedPick as specified below (tag "enemy.composition.pick.[tier]").
  - Chance effects that require random choices:
    - Earthquake!: each player (including the actor) rolls a d4 backward in seat order (tag "chance.earthquake.backRoll", ctx.actorUid is the roller).
    - Mystic Wave or Nefarious Spirit tie on “nearest player”: break uniformly at random among tied candidates (tag "tiebreak.nearest.pick"); candidates must be sorted by uid ascending before calling RNG.chooseOne to ensure deterministic iteration.
- Step 6 (combat/duel):
  - For each combat round, roll dice in this order:
    1) Player attack d6 (tag "combat.player.attack" or "duel.player.attack")
    2) Player defense d6 (tag "combat.player.defense" or "duel.player.defense")
    3) For each currently alive enemy on the tile’s enemy queue, in their queue order:
       - Enemy attack d6 (tag "combat.enemy.attack", ctx includes enemyId or index)
       - Enemy defense d6 (tag "combat.enemy.defense")
    - Apply modifiers and simultaneous resolution as per Combat spec.
    - If Duelist performs a defense re-roll, consume an extra die (tag "duel.defense.reroll") at the moment the ability is used.
  - When an enemy dies, immediately process loot drop roll before proceeding to the next enemy/round (tag "loot.drop.roll.[tier]").
- Step 7 (postCombat): no RNG.
- Step 8 (capacity): no RNG.

Deck exhaustion and reshuffling
- When a deck runs out, immediately reshuffle its discard pile and reset the deck:
  - Call shuffleInPlace on the discard array (tag "deck.reshuffle.[deckId]"), then set deck = shuffledDiscards, discards = [].
  - Persist the new deck array. Do not draw in the same atomic update unless required by the reducer design (prefer separate steps for clarity).

Weighted choices (canonical policy)
- enemy tile composition
  - Tier 1 (E1): deterministic => 1× T1 (no RNG).
  - Tier 2 (E2): 70% [2× T1], 30% [1× T2].
  - Tier 3 (E3): 70% [2× T2], 20% [1× T2 + 1× T1], 10% [1× T3].
  - Use weightedPick with integer weights [70,30] or [70,20,10].
  - Audit data should record weights and r (the raw random threshold).
- loot drops by enemy tier
  - T1 enemy: 50% draw 1× T1 treasure; 50% nothing → weights [50,50]
  - T2 enemy: 70% 1× T2; 15% 1× T1; 15% nothing → weights [70,15,15]
  - T3 enemy: 80% 1× T3; 20% 1× T2 → weights [80,20]
  - If a draw is indicated, draw from the top of the corresponding treasure deck (no RNG call for the draw itself).
- tie-breaker nearest player
  - If multiple candidates at equal distance: chooseOne uniformly among candidates sorted by uid ascending.
  - Record candidate list length and chosen uid in audit/log.

Logging and audit expectations
- Public log (games/{gameId}/log) should include user-facing RNG outcomes:
  - DiceRolled: { who, sides, value, modifiers?, total? }
  - DeckShuffled: { deckId, size, headPreview: [first 3 ids], hash?: sha256(head N) } // hash optional if feasible
  - EnemyCompositionChosen: { tileId, tier, choice } e.g., "2xT1"
  - LootRoll: { enemyTier, outcome } e.g., "T3" or "none"
  - TieBreakResolved: { reason, candidates: [uids], chosenUid }
  - TurnOrderRolled: { uid, value } and TieBreakRerolled: { uid, value } (for setup)
- rngAudit (dev only) adds low-level details:
  - For "dice": { sides, value }
  - For "weighted": { weights, r, index }
  - For "shuffle": { deckId, size, swaps: omitted, headPreview }
  - For "sample": arbitrary data
- Ordering
  - Each audit entry gets rng.seq incremented atomically by the reducer (read-modify-write). The reducer must guard against parallel updates by only allowing currentPlayer (or StartGame actor) to mutate seq.
  - Action → state mutation → events → logs → optional rngAudit. A failed audit write must not invalidate the state mutation.

Determinism across clients and replays
- Cross-client
  - The currentPlayer’s client reduces the action, calls RNG, and writes the resulting state changes to Firestore. Other clients never recompute randomness; they simply render the persisted outcome.
  - If a client attempts to reduce out-of-turn actions, security rules and reducer guards reject the write.
- Replays and tests
  - With rng.seed set, the same Given → When sequence produces identical outcomes provided the same reducer paths (and entropy order) are taken.
  - Test helpers should be able to:
    - createSeededRNG("fixed-seed")
    - captureRngAudit(rng) to store entries side-by-side with golden logs
    - assertLogContainsDice("move.roll", value)
  - Golden fixtures pin: initial deck arrays (or their seeds), RNG seed, and action sequence.

Engine integration points
- Command handlers/reducers that must use RNG:
  - startGame(): shuffles + turn order
  - rollMovement()
  - resolveChanceCard() for Earthquake!, Mystic Wave, Nefarious Spirit, Vital Energy
  - spawnEnemiesOnTile()
  - resolveCombatRound() and resolveDuelRound()
  - applyDuelistReroll()
  - processLootDrop()
  - reshuffleDeckIfEmpty()
- Prohibited
  - UI components must never call RNG. They dispatch actions; only the engine mutates state and calls RNG.

Security and idempotency
- Validate that any RNG-dependent action is only accepted when the actor is allowed (currentPlayerUid, or StartGame by room owner).
- Reducers must be idempotent:
  - A duplicate RollMovement action with same actionId should be rejected or no-op (use actionId-based de-duplication).
  - Commit all state changes and emitted events atomically per action reduce.

Edge cases and clarifications
- Multi-enemy fights
  - For simultaneous resolution, but deterministic dice ordering:
    - Player rolls first (attack then defense), then each enemy in queue order rolls (attack then defense).
    - If a re-roll affects a previously rolled die, consume additional RNG at the moment of re-roll.
- Re-ordering enemies
  - Enemy queue order is set when spawning (deck draw order or composition rule). Do not reshuffle mid-combat.
- Multiple drops in one combat
  - Resolve drop for each enemy immediately upon that enemy’s death; do not batch at end.
- Earthquake! simultaneous
  - Resolve per player in seat order (lowest seatIndex to highest), consuming RNG per player. Movement resulting from Earthquake! cannot cause intermediate duels; follow movement rules doc for backward traversal.
- Final tile tie-breaker
  - No RNG; bracket order is seat order.

Pseudocode examples

1) unbiased dN roll
function uniformInt(rng, min, max, tag, ctx) {
  const n = max - min + 1;
  if (n <= 0) throw new Error("bad range");
  const maxU32 = 0x100000000; // 2^32
  const limit = Math.floor(maxU32 / n) * n;
  let u;
  do { u = rng.nextUint32(tag, ctx); } while (u >= limit);
  return min + (u % n);
}

function rollDie(rng, sides, tag, ctx) {
  const value = uniformInt(rng, 1, sides, tag, ctx);
  return { sides, value };
}

2) Fisher–Yates shuffle
function shuffleInPlace(rng, arr, tag, ctx) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = uniformInt(rng, 0, i, tag, { ...ctx, i });
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

3) weighted pick
function weightedPick(rng, items, tag, ctx) {
  const sum = items.reduce((a, b) => a + b.weight, 0);
  let r = uniformInt(rng, 0, sum - 1, tag, ctx);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].weight;
    if (r < acc) return { index: i, item: items[i].item, r };
  }
  // should not reach
  return { index: items.length - 1, item: items[items.length - 1].item, r: sum - 1 };
}

4) enemy composition for E3
const choices = [
  { item: "2xT2", weight: 70 },
  { item: "1xT2+1xT1", weight: 20 },
  { item: "1xT3", weight: 10 },
];
const pick = weightedPick(rng, choices, "enemy.composition.pick.t3", { tileId, enemyTier: 3 });
// spawn accordingly in queue order shown by choice string

5) combat round dice ordering (simplified)
function rollCombatRound(rng, state) {
  const pa = rollDie(rng, 6, "combat.player.attack", { combatId: state.id });
  const pd = rollDie(rng, 6, "combat.player.defense", { combatId: state.id });
  const enemyRolls = [];
  for (const [idx, e] of state.enemies.entries()) {
    if (e.hp <= 0) continue;
    const ea = rollDie(rng, 6, "combat.enemy.attack", { combatId: state.id, enemyIndex: idx });
    const ed = rollDie(rng, 6, "combat.enemy.defense", { combatId: state.id, enemyIndex: idx });
    enemyRolls.push({ idx, ea, ed });
  }
  return { pa, pd, enemyRolls };
}

Test hooks
- withSeed(seed: string): returns engine bound to createRNG({ mode: "seeded", seed })
- recordAudit(fn): wraps RNG to push audit entries to an array for assertions
- assertUnbiasedDice: repeated rolls histogram sanity check (dev/test only)
- golden fixtures:
  - Fixture 01: StartGame with seed "seed-start-01" → stable deck head previews and fixed turn order
  - Fixture 02: E3 composition picks with seed "comp-01" → expected pick sequence [2xT2, 2xT2, 1xT2+1xT1, ...]
  - Fixture 03: Earthquake! with seats [A,B,C], seed "eq-01" → backRolls [2,1,3]
  - Fixture 04: Combat with Duelist re-roll → check extra RNG consumption tagged "duel.defense.reroll"

Validation and linting
- CI rule: fail build if Math.random is used anywhere.
- Unit tests ensure:
  - shuffleInPlace produces all permutations with correct probabilities for small arrays (statistical smoke test).
  - uniformInt is unbiased across range 1..6 and 1..4 within bounds.
  - weightedPick returns each outcome with approximate expected frequency over large N.

Performance and limits
- RNG calls are lightweight; audit writing is optional to minimize Firestore usage.
- When auditEnabled, prefer to store only:
  - dice: sides, value
  - weighted: weights length, index, r
  - shuffle: deckId, size, headPreview (3–5 ids)
- Use a ring buffer (keep last 500 entries) if storing audit on the game doc to avoid exceeding Firestore doc size.

Migration notes
- rng.mode defaults to "crypto" if missing.
- rng.seq defaults to 0 if missing; initialize on first RNG use.
- If migrating from earlier versions that did not tag RNG calls, permit missing ctx fields and skip audit population.

Developer checklist
- All reducers that need randomness accept an RNG param; never instantiate RNG inside the reducer.
- Every RNG call has a tag and context.
- Outcomes are persisted in state/logs first, then audit is attempted.
- Deck draws never call RNG; only shuffles do.
