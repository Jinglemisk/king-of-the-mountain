// /src/game/engine/index.ts
// Engine module exports

export { GameEngine } from './GameEngine';
export { loadBoard, validateBoard, buildReverseAdjacency } from './board';
export {
  isActionAllowed,
  getNextPhase,
  applyPhaseTransition,
  getLegalActionsForPhase
} from './phases';
export {
  computeMovementSteps,
  chooseBranch,
  applyLampIfEligible,
  canRetreat,
  validateMovePath
} from './movement';

export type {
  EngineState,
  EngineApi,
  EngineContext,
  EngineUpdate,
  Action,
  DomainEvent,
  DomainEventType,
  ActionType,
  Selectors,
  Invariants,
  RNG,
  DiceRoll,
  InvalidActionError,
  InternalCombatState,
  FightState,
  DuelState
} from './types';

export type {
  MoveContext,
  MovementStep,
  MovementResult,
  BranchChoice,
  MoveStyle,
  MoveDirection
} from './movement';