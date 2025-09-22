docs/CONTENT_CATALOG.md

Purpose
- Canonical master list of all content the engine references.
- Source for codegen of TypeScript types and JSON validators.
- Prevents drift between prose on cards and code by defining canonical IDs, schemas, and effect keys.

Versioning and scope
- Catalog version: 1.0.0
- Applies to board map v1.0, treasure/chance/enemy sets in GDD v1.0, and classes v1.0.

ID and naming conventions
- Canonical ID format: <category>.<slug>.v<major>
  - category: class | item | chance | enemy | tileType | composition | lootTable
  - slug: lowercase, kebab-case, ASCII only. Examples: scout, dagger, white-bearded-spirit, dragon-whelp.
  - v<major>: integer major version only (v1, v2, ...); bump when rules or payload shape changes in a breaking way.
- Examples
  - class.scout.v1
  - item.dagger.v1
  - chance.white-bearded-spirit.v1
  - enemy.dragon-whelp.v1
- Deck membership is a property (tier), not part of the ID.
- Text keys for UI localization: displayName and rulesText live alongside the canonical definition.

Standard enums and constants
- Tier: 1 | 2 | 3
- ItemKind: wearable | holdable | drinkable | small
- Slot: wearable (max 1), holdable (max 2), bandolier, backpack
- TileType: start | final | enemy | treasure | chance | sanctuary | empty
- Die: d4 | d6
- Targeting: self | nearestPlayer | specificPlayer | everyone | tileOccupant | anyPlayerOnTile
- Direction: forward | backward
- Visibility: public | hidden (inventory-only)
- EnemyTag: creature (all enemies in v1 have creature=true; may add humanoid/undead later)

JSON schemas (normative)

Schema: EffectSpec
- Purpose: Normalize all effects for items, chance cards, classes, and special rules. Each effect has a key and params.
- Effect keys by group
  - Movement and position
	- move_relative: { steps: integer, direction: "forward"|"backward", useHistory?: boolean, ignorePassThrough?: boolean }
	- roll_and_move: { die: "d4"|"d6", direction: "forward"|"backward", moveImmediately: boolean }
	- swap_positions: { target: "nearestPlayer"|"specificPlayer" }
	- move_to_player: { range?: integer, target: "nearestPlayer"|"specificPlayer", mustExist: boolean }
	- conditional_step_back_pre_resolve: { condition: "tileHasEnemyOrPlayer", steps: 1 }
	- blink_pre_resolve: { delta: -2|2, ignorePassThrough: true, sanctuaryBoundary: "stayWithin" }
  - Turn/phase and skip
	- skip_next_turn: {}
	- prevent_duels_this_turn: { scope: "youOnly"|"tile"|"global" }
	- invisibility_until: { end: "turnStart"|"movedByEffect", duelBlock: true }
	- keep_face_down_play_window: { when: "yourTurnOnly"|"anyTurn", uses: 1 }
  - Combat modifiers and healing
	- add_attack_this_turn: { value: integer }
	- add_defense_this_turn: { value: integer }
	- add_attack_first_round: { value: integer }       (used by Alchemist synergy)
	- add_defense_first_round: { value: integer }      (used by Alchemist synergy)
	- add_attack_static: { value: integer }            (while equipped/held)
	- add_defense_static: { value: integer }           (while equipped/held)
	- add_attack_vs_tag: { tag: "creature", value: integer }
	- add_defense_vs_tag: { tag: "creature", value: integer }
	- heal: { amount: integer, clampToMax: true }
	- heal_full: {}
	- prevent_next_damage: { amount: 1 }               (Wardstone)
	- once_per_duel_defense_reroll: {}
  - Inventory and capacity
	- capacity_mod: { slot: "bandolier"|"backpack", delta: integer }
	- place_trap_on_tile: { trapEffectId: "trap.skip-next-turn.v1", visibility: "public" }
	- return_item_to_bottom_of_deck: { target: "self", filter: "anyItem" }
  - Draw and loot
	- draw_treasure: { tier: 1|2|3, count: integer }
	- cancel_recent_card: { deck: "chance" }
	- raider_win_roll_for_loot: { die: "d6", success: [5,6], fightTileTreasureTier: true, elseTier: 1 }
  - Duel and PvP
	- initiate_duel: { target: "nearestPlayer"|"specificPlayer", reason?: string }
	- duelist_attack_bonus_in_duel: { value: integer }
	- monk_cancel_duel_roll: { die: "d6", success: [5,6], uses: 1 }
  - Global effects
	- global_move_all: { die: "d4"|"d6", direction: "backward", order: "seatOrderSimulated" }
- JSON Schema (abridged)

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "EffectSpec",
  "type": "object",
  "required": ["key"],
  "properties": {
	"key": { "type": "string" },
	"params": { "type": ["object", "null"] }
  },
  "additionalProperties": false
}

Schema: ClassDef

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ClassDef",
  "type": "object",
  "required": ["id", "displayName", "passives"],
  "properties": {
	"id": { "type": "string", "pattern": "^class\\.[a-z0-9-]+\\.v\\d+$" },
	"displayName": { "type": "string" },
	"startItems": { "type": "array", "items": { "type": "string" } },
	"passives": {
	  "type": "array",
	  "items": { "$ref": "EffectSpec" }
	},
	"flags": {
	  "type": "object",
	  "properties": {
		"noDuplicate": { "type": "boolean", "default": true }
	  },
	  "additionalProperties": false
	}
  },
  "additionalProperties": false
}

Schema: ItemDef (Treasure)

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ItemDef",
  "type": "object",
  "required": ["id", "displayName", "tier", "kind", "copies"],
  "properties": {
	"id": { "type": "string", "pattern": "^item\\.[a-z0-9-]+\\.v\\d+$" },
	"displayName": { "type": "string" },
	"tier": { "type": "integer", "enum": [1,2,3] },
	"kind": { "type": "string", "enum": ["wearable","holdable","drinkable","small"] },
	"equipSlots": {
	  "type": "array",
	  "items": { "type": "string", "enum": ["wearable","holdable","bandolier","backpack"] }
	},
	"visibility": { "type": "string", "enum": ["public","hidden"] },
	"rulesText": { "type": "string" },
	"effects": { "type": "array", "items": { "$ref": "EffectSpec" } },
	"modifiers": { "type": "array", "items": { "$ref": "EffectSpec" } },
	"copies": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}

Schema: ChanceDef

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ChanceDef",
  "type": "object",
  "required": ["id", "displayName", "effects", "copies"],
  "properties": {
	"id": { "type": "string", "pattern": "^chance\\.[a-z0-9-]+\\.v\\d+$" },
	"displayName": { "type": "string" },
	"rulesText": { "type": "string" },
	"keepFaceDown": { "type": "boolean", "default": false },
	"effects": { "type": "array", "items": { "$ref": "EffectSpec" } },
	"copies": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}

Schema: EnemyDef

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "EnemyDef",
  "type": "object",
  "required": ["id", "displayName", "tier", "hp", "atk", "def", "copies"],
  "properties": {
	"id": { "type": "string", "pattern": "^enemy\\.[a-z0-9-]+\\.v\\d+$" },
	"displayName": { "type": "string" },
	"tier": { "type": "integer", "enum": [1,2,3] },
	"hp": { "type": "integer", "minimum": 1 },
	"atk": { "type": "integer" },
	"def": { "type": "integer" },
	"tags": {
	  "type": "array",
	  "items": { "type": "string", "enum": ["creature"] },
	  "default": ["creature"]
	},
	"special": { "type": "array", "items": { "$ref": "EffectSpec" } },
	"copies": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}

Schema: TileTypeDef

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "TileTypeDef",
  "type": "object",
  "required": ["id", "displayName", "type"],
  "properties": {
	"id": { "type": "string", "pattern": "^tileType\\.[a-z0-9-]+\\.v\\d+$" },
	"displayName": { "type": "string" },
	"type": { "type": "string", "enum": ["start","final","enemy","treasure","chance","sanctuary","empty"] },
	"tier": { "type": ["integer","null"], "enum": [1,2,3,null] }
  },
  "additionalProperties": false
}

Schema: EnemyCompositionSet

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "EnemyCompositionSet",
  "type": "object",
  "required": ["id", "entries"],
  "properties": {
	"id": { "type": "string", "pattern": "^composition\\.[a-z0-9-]+\\.v\\d+$" },
	"entries": {
	  "type": "array",
	  "items": {
		"type": "object",
		"required": ["weight", "draw"],
		"properties": {
		  "weight": { "type": "number", "exclusiveMinimum": 0 },
		  "draw": {
			"type": "array",
			"items": {
			  "type": "object",
			  "required": ["fromTier", "count"],
			  "properties": {
				"fromTier": { "type": "integer", "enum": [1,2,3] },
				"count": { "type": "integer", "minimum": 1 }
			  }
			}
		  }
		},
		"additionalProperties": false
	  }
	}
  },
  "additionalProperties": false
}

Schema: LootTable

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "LootTable",
  "type": "object",
  "required": ["id", "rolls"],
  "properties": {
	"id": { "type": "string", "pattern": "^lootTable\\.[a-z0-9-]+\\.v\\d+$" },
	"rolls": {
	  "type": "object",
	  "properties": {
		"1": {
		  "type": "array",
		  "items": {
			"type": "object",
			"required": ["prob", "reward"],
			"properties": {
			  "prob": { "type": "number", "minimum": 0, "maximum": 1 },
			  "reward": { "type": "object", "properties": { "draw_treasure": { "type": "object", "properties": { "tier": { "type": "integer" }, "count": { "type": "integer" } } }, "nothing": { "type": "boolean" } } }
			}
		  }
		},
		"2": { "$ref": "#/properties/1" },
		"3": { "$ref": "#/properties/1" }
	  }
	}
  },
  "additionalProperties": false
}

Tile types (canonical)
- tileType.start.v1: type=start
- tileType.final.v1: type=final
- tileType.enemy.v1: type=enemy; tier: 1|2|3 at runtime
- tileType.treasure.v1: type=treasure; tier: 1|2|3 at runtime
- tileType.chance.v1: type=chance
- tileType.sanctuary.v1: type=sanctuary
- tileType.empty.v1: type=empty

Classes (canonical list)
- class.scout.v1
  - displayName: Scout
  - startItems: [item.trap.v1]
  - passives:
	- { key: "ignore_traps_and_ambush", params: null }  (engine guard in movement/placement)
	- { key: "trap_pickup_instead_of_trigger", params: null }
- class.hunter.v1
  - passives:
	- { key: "add_attack_vs_tag", params: { tag: "creature", value: 1 } }
- class.raider.v1
  - passives:
	- { key: "raider_win_roll_for_loot", params: { die: "d6", success: [5,6], fightTileTreasureTier: true, elseTier: 1 } }
- class.guardian.v1
  - startItems: [item.wooden-shield.v1]
  - passives:
	- { key: "add_defense_vs_tag", params: { tag: "creature", value: 1 } }
- class.duelist.v1
  - passives:
	- { key: "duelist_attack_bonus_in_duel", params: { value: 1 } }
	- { key: "once_per_duel_defense_reroll", params: {} }
- class.alchemist.v1
  - passives:
	- { key: "capacity_mod", params: { slot: "bandolier", delta: 1 } }
	- { key: "potion_heal_bonus", params: { amount: 1 } }
	- { key: "carryover_turn_potion_to_first_combat", params: true }  (engine translates to add_attack_first_round/add_defense_first_round where applicable)
- class.porter.v1
  - passives:
	- { key: "capacity_mod", params: { slot: "backpack", delta: 1 } }
- class.monk.v1
  - passives:
	- { key: "monk_cancel_duel_roll", params: { die: "d6", success: [5,6], uses: 1 } }

Treasure items by tier (canonical definitions)

Tier 1 (24 total)
- item.dagger.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 4
  - modifiers: [{ key: "add_attack_static", params: { value: 1 } }]
- item.wooden-shield.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 4
  - modifiers: [{ key: "add_defense_static", params: { value: 1 } }]
- item.robe.v1
  - kind: wearable, equipSlots: [wearable], visibility: public, copies: 3
  - modifiers: [{ key: "add_defense_static", params: { value: 1 } }]
- item.crude-axe.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 3
  - modifiers: [{ key: "add_attack_static", params: { value: 1 } }]
- item.lamp.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 2
  - effects: [{ key: "conditional_step_back_pre_resolve", params: { condition: "tileHasEnemyOrPlayer", steps: 1 } }]
- item.trap.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 3
  - effects: [{ key: "place_trap_on_tile", params: { trapEffectId: "trap.skip-next-turn.v1", visibility: "public" } }]
- item.luck-charm.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [{ key: "cancel_recent_card", params: { deck: "chance" } }]
- item.beer.v1
  - kind: drinkable, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [
	  { key: "heal", params: { amount: 3, clampToMax: true } },
	  { key: "modify_next_movement", params: { delta: -1 } }
	]
- item.agility-draught.v1
  - kind: drinkable, equipSlots: [bandolier, backpack], visibility: hidden, copies: 1
  - effects: [{ key: "add_defense_this_turn", params: { value: 1 } }]

Tier 2 (18 total)
- item.heirloom-armor.v1
  - kind: wearable, equipSlots: [wearable], visibility: public, copies: 3
  - modifiers: [{ key: "add_defense_static", params: { value: 2 } }]
- item.silver-shield.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 3
  - modifiers: [{ key: "add_defense_static", params: { value: 2 } }]
- item.lords-sword.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 3
  - modifiers: [{ key: "add_attack_static", params: { value: 2 } }]
- item.boogey-bane.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 2
  - modifiers: [{ key: "add_attack_vs_tag", params: { tag: "creature", value: 2 } }]
- item.velvet-cloak.v1
  - kind: wearable, equipSlots: [wearable], visibility: public, copies: 2
  - effects: [{ key: "modify_movement_roll", params: { delta: +1 } }]
- item.rage-potion.v1
  - kind: drinkable, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [{ key: "add_attack_this_turn", params: { value: 1 } }]
- item.fairy-dust.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [
	  { key: "keep_face_down_play_window", params: { when: "yourTurnOnly", uses: 1 } },
	  { key: "invisibility_until", params: { end: "turnStart", duelBlock: true } }
	]
- item.smoke-bomb.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 1
  - effects: [
	  { key: "reaction_on_duel_offer", params: true },
	  { key: "prevent_duels_this_turn", params: { scope: "youOnly" } }
	]

Tier 3 (10 total)
- item.royal-aegis.v1
  - kind: wearable, equipSlots: [wearable], visibility: public, copies: 2
  - effects: [
	  { key: "modify_movement_roll", params: { delta: -1 } }
	]
  - modifiers: [{ key: "add_defense_static", params: { value: 3 } }]
- item.essence-mysterious-flower.v1
  - kind: drinkable, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [{ key: "heal_full", params: {} }]
- item.dragonfang-greatsword.v1
  - kind: holdable, equipSlots: [holdable], visibility: public, copies: 2
  - modifiers: [{ key: "add_attack_static", params: { value: 3 } }]
- item.blink-scroll.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [{ key: "blink_pre_resolve", params: { delta: null, ignorePassThrough: true, sanctuaryBoundary: "stayWithin" } }]
  - Note: UI must prompt +2 or −2 and block illegal sanctuary crossings caused by forced moves.
- item.wardstone.v1
  - kind: small, equipSlots: [bandolier, backpack], visibility: hidden, copies: 2
  - effects: [{ key: "prevent_next_damage", params: { amount: 1 } }]

Chance cards (canonical definitions; example 32-card set)

Movement/setback
- chance.exhaustion.v1 (copies: 4)
  - effects: [{ key: "move_relative", params: { steps: 1, direction: "backward", useHistory: true } }]
- chance.cave-in.v1 (copies: 3)
  - effects: [{ key: "move_relative", params: { steps: 3, direction: "backward", useHistory: true } }]
- chance.faint.v1 (copies: 2)
  - effects: [{ key: "skip_next_turn", params: {} }]

Extra movement
- chance.vital-energy.v1 (copies: 2)
  - effects: [{ key: "roll_and_move", params: { die: "d4", direction: "forward", moveImmediately: true } }]

Global
- chance.earthquake.v1 (copies: 2)
  - effects: [{ key: "global_move_all", params: { die: "d4", direction: "backward", order: "seatOrderSimulated" } }]

Mixed boon/penalty
- chance.lost-treasure.v1 (copies: 2)
  - effects: [
	  { key: "skip_next_turn", params: {} },
	  { key: "draw_treasure", params: { tier: 1, count: 2 } }
	]
- chance.jinn-thief.v1 (copies: 3)
  - effects: [{ key: "return_item_to_bottom_of_deck", params: { target: "self", filter: "anyItem" } }]
- chance.sprained-wrist.v1 (copies: 3)
  - effects: [{ key: "damage_self", params: { amount: 1 } }]

Small boons
- chance.covered-pit.v1 (copies: 3)
  - effects: [{ key: "draw_treasure", params: { tier: 1, count: 1 } }]
- chance.white-bearded-spirit.v1 (copies: 2)
  - effects: [{ key: "move_relative", params: { steps: 2, direction: "forward", useHistory: false } }]

PvP positioning
- chance.mystic-wave.v1 (copies: 2)
  - effects: [{ key: "swap_positions", params: { target: "nearestPlayer" } }]
- chance.nefarious-spirit.v1 (copies: 2)
  - effects: [
	  { key: "move_to_player", params: { range: 6, target: "nearestPlayer", mustExist: true } },
	  { key: "initiate_duel", params: { target: "nearestPlayer", reason: "Nefarious Spirit" } }
	]

Keepables
- chance.ambush-opportunity.v1 (copies: 2)
  - keepFaceDown: true
  - effects: [
	  { key: "keep_face_down_play_window", params: { when: "yourTurnOnly", uses: 1 } },
	  { key: "set_ambush_here", params: { duelFirst: true, banOnSanctuary: true } }
	]
- chance.instinct.v1 (copies: 2)
  - keepFaceDown: true
  - effects: [
	  { key: "keep_face_down_play_window", params: { when: "yourTurnOnly", uses: 1 } },
	  { key: "instinct_move_plus_or_minus_one", params: { timing: ["beforeMovementRoll","afterMovementRoll"], direction: ["forward","backward"] } }
	]

Notes on new keys used above
- modify_next_movement: applied to next d4 roll only
- modify_movement_roll: persistent while equipped
- damage_self: used for Sprained Wrist
- reaction_on_duel_offer: gate that allows play as an interrupt only when offered a duel
- set_ambush_here: engine places a one-shot duel hook on the current non-Sanctuary tile
- instinct_move_plus_or_minus_one: resolves using movement spec; useHistory true if going backward

Enemy decks (canonical definitions and counts; tags: ["creature"])

Tier 1 (approx 18 total; copy counts per GDD)
- enemy.goblin.v1: hp 1, atk +1, def 0, copies 6
- enemy.wolf.v1: hp 1, atk +2, def -1, copies 4
- enemy.skeleton.v1: hp 1, atk +1, def +1, copies 4
- enemy.bandit.v1: hp 1, atk +1, def 0, copies 4

Tier 2 (approx 12)
- enemy.orc.v1: hp 2, atk +2, def +1, copies 4
- enemy.troll.v1: hp 2, atk +3, def 0, copies 4
- enemy.cultist.v1: hp 2, atk +1, def +2, copies 2
- enemy.ogre.v1: hp 3, atk +2, def +1, copies 2

Tier 3 (approx 10)
- enemy.dragon-whelp.v1: hp 3, atk +3, def +2, copies 3
- enemy.lich.v1: hp 3, atk +2, def +3, copies 2
- enemy.demon.v1: hp 4, atk +3, def +1, copies 2
- enemy.giant.v1: hp 4, atk +2, def +2, copies 3

Enemy tile compositions (by tile tier)

- composition.enemy-tile-t1.v1
  - entries:
	- weight 1.0: draw [{ fromTier: 1, count: 1 }]

- composition.enemy-tile-t2.v1
  - entries:
	- weight 0.70: draw [{ fromTier: 1, count: 2 }]
	- weight 0.30: draw [{ fromTier: 2, count: 1 }]

- composition.enemy-tile-t3.v1
  - entries:
	- weight 0.70: draw [{ fromTier: 2, count: 2 }]
	- weight 0.20: draw [{ fromTier: 2, count: 1 }, { fromTier: 1, count: 1 }]
	- weight 0.10: draw [{ fromTier: 3, count: 1 }]

Loot tables (per enemy defeated)
- lootTable.enemy-defeat.v1
  - rolls:
	- for T1 enemy:
	  - 0.50: { draw_treasure: { tier: 1, count: 1 } }
	  - 0.50: { nothing: true }
	- for T2 enemy:
	  - 0.70: { draw_treasure: { tier: 2, count: 1 } }
	  - 0.15: { draw_treasure: { tier: 1, count: 1 } }
	  - 0.15: { nothing: true }
	- for T3 enemy:
	  - 0.80: { draw_treasure: { tier: 3, count: 1 } }
	  - 0.20: { draw_treasure: { tier: 2, count: 1 } }

Effect dictionary (mapping of human rules text to effect keys and params)

Items
- Dagger: “+1 Attack (holdable)”
  - add_attack_static { value: 1 }
- Wooden Shield: “+1 Defense (holdable)”
  - add_defense_static { value: 1 }
- Robe: “+1 Defense (wearable)”
  - add_defense_static { value: 1 }
- Crude Axe: “+1 Attack (holdable)”
  - add_attack_static { value: 1 }
- Lamp: “if your turn would end on a tile with a player or an enemy, you may step back 1 tile BEFORE resolving that tile”
  - conditional_step_back_pre_resolve { condition: "tileHasEnemyOrPlayer", steps: 1 }
- Trap (Small): “place on your current tile; the next player who lands here skips their next turn (visible)”
  - place_trap_on_tile { trapEffectId: "trap.skip-next-turn.v1", visibility: "public" }
  - Trap payload trap.skip-next-turn.v1 → skip_next_turn on victim at Step 1 of their next turn (movement-triggered)
- Luck Charm: “cancel a Chance card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1”
  - cancel_recent_card { deck: "chance" } (interrupt window) + implicit return-to-bottom
- Beer: “heal 3 HP; −1 to your next movement roll”
  - heal { amount: 3, clampToMax: true } + modify_next_movement { delta: -1 }
- Agility Draught: “+1 to all your Defense rolls this turn”
  - add_defense_this_turn { value: 1 }
- Heirloom Armor: “+2 Defense (wearable)”
  - add_defense_static { value: 2 }
- Silver Shield: “+2 Defense (holdable)”
  - add_defense_static { value: 2 }
- Lord’s Sword: “+2 Attack (holdable)”
  - add_attack_static { value: 2 }
- Boogey-Bane: “+2 Attack vs creatures only”
  - add_attack_vs_tag { tag: "creature", value: 2 }
- Velvet Cloak: “+1 to movement roll”
  - modify_movement_roll { delta: +1 } (while equipped)
- Rage Potion: “+1 to all your Attack rolls this turn”
  - add_attack_this_turn { value: 1 }
- Fairy Dust: “use before choosing Sleep; you become invisible to other players until your next turn starts or if any effect moves you; cannot be dueled while invisible”
  - keep_face_down_play_window { when: "yourTurnOnly", uses: 1 }
  - invisibility_until { end: "turnStart", duelBlock: true }
- Smoke Bomb: “when someone offers a duel to you, play to prevent any duels for the remainder of the current turn; return to bottom of T2”
  - reaction_on_duel_offer + prevent_duels_this_turn { scope: "youOnly" }
- Royal Aegis: “+3 Defense, −1 to movement roll”
  - add_defense_static { value: 3 } + modify_movement_roll { delta: -1 }
- Essence of the Mysterious Flower: “fully heal to max”
  - heal_full {}
- Dragonfang Greatsword: “+3 Attack (holdable)”
  - add_attack_static { value: 3 }
- Blink Scroll: “move yourself +2 or −2 tiles before resolving your tile; ignore pass-through effects; cannot move into or out of Sanctuary if a card/effect would force you”
  - blink_pre_resolve { delta: ±2, ignorePassThrough: true, sanctuaryBoundary: "stayWithin" } (engine enforces ± choice)
- Wardstone: “the next time you would lose HP, prevent 1 HP loss, then discard”
  - prevent_next_damage { amount: 1 }

Chance
- Exhaustion: “move 1 back”
  - move_relative { steps: 1, direction: "backward", useHistory: true }
- Cave-in: “move 3 back”
  - move_relative { steps: 3, direction: "backward", useHistory: true }
- Faint: “skip your next turn”
  - skip_next_turn {}
- Vital Energy: “roll movement again immediately and move”
  - roll_and_move { die: "d4", direction: "forward", moveImmediately: true }
- Earthquake!: “everyone rolls d4 and moves backward that much (resolve in seating order; effectively simultaneous; no intermediate duels)”
  - global_move_all { die: "d4", direction: "backward", order: "seatOrderSimulated" }
- Lost Treasure: “skip next turn; draw 2 Tier 1 Treasures now”
  - skip_next_turn {} + draw_treasure { tier: 1, count: 2 }
- Jinn Thief: “choose one of your items and return it to the bottom of the matching Treasure tier deck”
  - return_item_to_bottom_of_deck { target: "self", filter: "anyItem" }
- Sprained Wrist: “lose 1 HP”
  - damage_self { amount: 1 }
- Covered Pit: “draw 1 Tier 1 Treasure now”
  - draw_treasure { tier: 1, count: 1 }
- White-Bearded Spirit: “move 2 forward”
  - move_relative { steps: 2, direction: "forward", useHistory: false }
- Mystic Wave: “swap positions with the nearest player (Sanctuary allowed because you affect yourself)”
  - swap_positions { target: "nearestPlayer" }
- Nefarious Spirit: “if any player is within 6 tiles, move to that player and immediately start a duel (nearest; tie random)”
  - move_to_player { range: 6, target: "nearestPlayer", mustExist: true }
  - initiate_duel { target: "nearestPlayer", reason: "Nefarious Spirit" }
- Ambush Opportunity: “keep face down; starting next turn, place it on your current non-Sanctuary tile; the next time a player enters that tile during movement, you may immediately start a duel before the tile resolves; then discard”
  - keep_face_down_play_window { when: "yourTurnOnly", uses: 1 }
  - set_ambush_here { duelFirst: true, banOnSanctuary: true }
- Instinct: “keep face down; once on your turn, move yourself +1 or −1 tile before or after your movement roll”
  - keep_face_down_play_window { when: "yourTurnOnly", uses: 1 }
  - instinct_move_plus_or_minus_one { timing: ["beforeMovementRoll","afterMovementRoll"], direction: ["forward","backward"] }

Classes (effect mapping)
- Scout: “ignore Traps and Ambush; may pick up a Trap you step onto instead of triggering it”
  - ignore_traps_and_ambush {}
  - trap_pickup_instead_of_trigger {}
- Hunter: “+1 Attack vs creatures during fights”
  - add_attack_vs_tag { tag: "creature", value: 1 }
- Raider: “When you win any fight or duel, roll d6. On 5–6, draw 1 Treasure. If you won a fight on an Enemy tile, draw from that tile’s Treasure tier; otherwise draw Tier 1.”
  - raider_win_roll_for_loot { die: "d6", success: [5,6], fightTileTreasureTier: true, elseTier: 1 }
- Guardian: “+1 Defense vs creatures during fights”
  - add_defense_vs_tag { tag: "creature", value: 1 }
- Duelist: “+1 Attack in duels; once per duel, you may re-roll your Defense die”
  - duelist_attack_bonus_in_duel { value: 1 }
  - once_per_duel_defense_reroll {}
- Alchemist: “+1 Bandolier capacity; healing potions heal +1; ‘this turn’ potions also apply to first round of combat if used before fight”
  - capacity_mod { slot: "bandolier", delta: 1 }
  - potion_heal_bonus { amount: 1 }
  - carryover_turn_potion_to_first_combat { true } (engine creates add_attack_first_round / add_defense_first_round)
- Porter: “+1 Backpack capacity”
  - capacity_mod { slot: "backpack", delta: 1 }
- Monk: “Once per game, when offered a duel, roll d6; on 5–6 you cancel that duel”
  - monk_cancel_duel_roll { die: "d6", success: [5,6], uses: 1 }

Deck manifests (for data generation)
- treasure.t1
  - item.dagger.v1 x4
  - item.wooden-shield.v1 x4
  - item.robe.v1 x3
  - item.crude-axe.v1 x3
  - item.lamp.v1 x2
  - item.trap.v1 x3
  - item.luck-charm.v1 x2
  - item.beer.v1 x2
  - item.agility-draught.v1 x1
- treasure.t2
  - item.heirloom-armor.v1 x3
  - item.silver-shield.v1 x3
  - item.lords-sword.v1 x3
  - item.boogey-bane.v1 x2
  - item.velvet-cloak.v1 x2
  - item.rage-potion.v1 x2
  - item.fairy-dust.v1 x2
  - item.smoke-bomb.v1 x1
- treasure.t3
  - item.royal-aegis.v1 x2
  - item.essence-mysterious-flower.v1 x2
  - item.dragonfang-greatsword.v1 x2
  - item.blink-scroll.v1 x2
  - item.wardstone.v1 x2
- chance (32)
  - chance.exhaustion.v1 x4
  - chance.cave-in.v1 x3
  - chance.faint.v1 x2
  - chance.vital-energy.v1 x2
  - chance.earthquake.v1 x2
  - chance.lost-treasure.v1 x2
  - chance.jinn-thief.v1 x3
  - chance.sprained-wrist.v1 x3
  - chance.covered-pit.v1 x3
  - chance.white-bearded-spirit.v1 x2
  - chance.mystic-wave.v1 x2
  - chance.nefarious-spirit.v1 x2
  - chance.ambush-opportunity.v1 x2
  - chance.instinct.v1 x2
- enemy.t1 (~18)
  - enemy.goblin.v1 x6
  - enemy.wolf.v1 x4
  - enemy.skeleton.v1 x4
  - enemy.bandit.v1 x4
- enemy.t2 (~12)
  - enemy.orc.v1 x4
  - enemy.troll.v1 x4
  - enemy.cultist.v1 x2
  - enemy.ogre.v1 x2
- enemy.t3 (~10)
  - enemy.dragon-whelp.v1 x3
  - enemy.lich.v1 x2
  - enemy.demon.v1 x2
  - enemy.giant.v1 x3

Engine-side invariants (content-related)
- All enemies have tag creature in v1.
- Wearable capacity 1; holdable capacity 2; bandolier capacity 1 (2 for Alchemist); backpack capacity 1 (2 for Porter).
- Equipped items are public; inventory is hidden.
- Keep-face-down chance cards (Ambush Opportunity, Instinct) must be stored with visibility=hidden and an available keep slot (virtual, not consuming inventory slot; engine tracks per-player “keptChance” slots with uses).
- Trap placement banned on Sanctuary tiles; Ambush banned on Sanctuary tiles.
- Lamp triggers if the final destination tile prior to resolving contains any enemy or player.
- Blink cannot force entering/exiting Sanctuary; if a delta would cross boundary, reject that choice.

Serialization notes and effect normalization
- Items with persistent modifiers use modifiers[] (e.g., add_attack_static). One-shot or conditional behaviors use effects[].
- Classes use passives[] only; no copies field.
- Chance cards use effects[]; keepFaceDown indicates delayed, player-controlled use.
- For log formatting, use displayName and ID; effect resolution logs should include effect.key and params to support deterministic replay.

Validation helpers (generated from schemas)
- validateClassDef(json): boolean
- validateItemDef(json): boolean
- validateChanceDef(json): boolean
- validateEnemyDef(json): boolean
- validateCompositionSet(json): boolean
- validateLootTable(json): boolean

Open TODOs for v1.1
- Consider adding tags humanoid/undead/beast to enemies to support future items.
- Define explicit schema for trap tile-state entries (ownerUid, placedAtTurn, trapEffectId).
- Decide storage model for “kept” Chance cards (per-player list vs. tile annotations) and codify as schema (likely in TS_TYPES_AND_INTERFACES.md).

Appendix: Minimal JSON examples

Example ItemDef (Lamp)

{
  "id": "item.lamp.v1",
  "displayName": "Lamp",
  "tier": 1,
  "kind": "holdable",
  "equipSlots": ["holdable"],
  "visibility": "public",
  "rulesText": "If your turn would end on a tile with a player or an enemy, you may step back 1 tile before resolving that tile.",
  "effects": [
	{ "key": "conditional_step_back_pre_resolve", "params": { "condition": "tileHasEnemyOrPlayer", "steps": 1 } }
  ],
  "copies": 2
}

Example ChanceDef (Earthquake)

{
  "id": "chance.earthquake.v1",
  "displayName": "Earthquake!",
  "rulesText": "Everyone rolls d4 and moves backward that much.",
  "keepFaceDown": false,
  "effects": [
	{ "key": "global_move_all", "params": { "die": "d4", "direction": "backward", "order": "seatOrderSimulated" } }
  ],
  "copies": 2
}

Example EnemyDef (Orc)

{
  "id": "enemy.orc.v1",
  "displayName": "Orc",
  "tier": 2,
  "hp": 2,
  "atk": 2,
  "def": 1,
  "tags": ["creature"],
  "special": [],
  "copies": 4
}

Example ClassDef (Duelist)

{
  "id": "class.duelist.v1",
  "displayName": "Duelist",
  "startItems": [],
  "passives": [
	{ "key": "duelist_attack_bonus_in_duel", "params": { "value": 1 } },
	{ "key": "once_per_duel_defense_reroll", "params": {} }
  ],
  "flags": { "noDuplicate": true }
}

This document is the canonical source for content IDs, counts, and effect normalization. Any gameplay change to an item, chance card, enemy, or class must update this file (and bump the v in the ID if the payload shape changes).