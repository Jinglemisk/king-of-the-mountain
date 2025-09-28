import { create } from 'zustand';
import { getActionHandlers } from '../../net/actionHandlers';

// Simplified types for UI store to avoid circular dependencies
interface PlayerState {
  uid: string;
  nickname?: string;
  position: number;
  hp: number;
  maxHp: number;
  classId: string;
  equipped?: any;
  inventory?: any;
  tempEffects?: any;
  flags?: any;
}

interface GameState {
  id: string;
  currentPlayerUid: string;
  phase: string;
  players: Record<string, PlayerState>;
  board?: any;
  combat?: any;
  duel?: any;
  tileState?: any;
}

interface RoomData {
  id: string;
  code: string;
  ownerUid: string;
  gameId?: string;
}

interface UIState {
  // Modal/Dialog states
  activeDialog: 'treasure' | 'chance' | 'combat' | 'duel' | 'capacity' | 'branch' | null;
  pendingCard: any | null;
  branchOptions: number[] | null;

  // UI-specific states
  selectedTarget: string | null;
  hoveredTile: number | null;
  animatingMovement: boolean;
  diceRolling: boolean;
  lastDiceResult: { type: 'd4' | 'd6'; value: number } | null;

  // Interrupt prompts
  activeInterrupt: 'lamp' | 'smokeBomb' | 'luckCharm' | 'wardstone' | 'blinkScroll' | null;
  interruptContext: any | null;
}

interface GameStore {
  // Game state from engine
  gameState: GameState | null;
  room: RoomData | null;
  myUid: string | null;

  // UI state
  ui: UIState;

  // Actions
  setGameState: (state: GameState) => void;
  setRoom: (room: RoomData) => void;
  setMyUid: (uid: string) => void;

  // UI actions
  setActiveDialog: (dialog: UIState['activeDialog']) => void;
  setPendingCard: (card: any) => void;
  setBranchOptions: (options: number[] | null) => void;
  setSelectedTarget: (target: string | null) => void;
  setHoveredTile: (tile: number | null) => void;
  setAnimatingMovement: (animating: boolean) => void;
  setDiceRolling: (rolling: boolean) => void;
  setLastDiceResult: (result: UIState['lastDiceResult']) => void;
  setActiveInterrupt: (interrupt: UIState['activeInterrupt'], context?: any) => void;

  // Computed getters
  getMyPlayer: () => PlayerState | null;
  isMyTurn: () => boolean;
  getCurrentPhase: () => string | null;
  getVisiblePlayers: () => PlayerState[];

  // Game actions
  performSleep: () => Promise<void>;
  performMove: () => Promise<void>;
  performBranchChoice: (targetNodeId: number) => Promise<void>;
  performDuelOffer: (targetUid: string) => Promise<void>;
  performRetreat: () => Promise<void>;
  performEndTurn: () => Promise<void>;
  performContinue: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: null,
  room: null,
  myUid: null,

  ui: {
    activeDialog: null,
    pendingCard: null,
    branchOptions: null,
    selectedTarget: null,
    hoveredTile: null,
    animatingMovement: false,
    diceRolling: false,
    lastDiceResult: null,
    activeInterrupt: null,
    interruptContext: null,
  },

  // Actions
  setGameState: (state) => set({ gameState: state }),
  setRoom: (room) => set({ room }),
  setMyUid: (uid) => set({ myUid: uid }),

  // UI actions
  setActiveDialog: (dialog) => set((state) => ({
    ui: { ...state.ui, activeDialog: dialog }
  })),

  setPendingCard: (card) => set((state) => ({
    ui: { ...state.ui, pendingCard: card }
  })),

  setBranchOptions: (options) => set((state) => ({
    ui: { ...state.ui, branchOptions: options }
  })),

  setSelectedTarget: (target) => set((state) => ({
    ui: { ...state.ui, selectedTarget: target }
  })),

  setHoveredTile: (tile) => set((state) => ({
    ui: { ...state.ui, hoveredTile: tile }
  })),

  setAnimatingMovement: (animating) => set((state) => ({
    ui: { ...state.ui, animatingMovement: animating }
  })),

  setDiceRolling: (rolling) => set((state) => ({
    ui: { ...state.ui, diceRolling: rolling }
  })),

  setLastDiceResult: (result) => set((state) => ({
    ui: { ...state.ui, lastDiceResult: result }
  })),

  setActiveInterrupt: (interrupt, context) => set((state) => ({
    ui: { ...state.ui, activeInterrupt: interrupt, interruptContext: context }
  })),

  // Computed getters
  getMyPlayer: () => {
    const state = get();
    if (!state.gameState || !state.myUid) return null;
    return state.gameState.players[state.myUid] || null;
  },

  isMyTurn: () => {
    const state = get();
    return state.gameState?.currentPlayerUid === state.myUid;
  },

  getCurrentPhase: () => {
    return get().gameState?.phase || null;
  },

  getVisiblePlayers: () => {
    const state = get();
    if (!state.gameState) return [];
    return Object.values(state.gameState.players);
  },

  // Game actions
  performSleep: async () => {
    const handlers = getActionHandlers();
    const result = await handlers.chooseSleep();
    if (!result.success) {
      console.error('Failed to sleep:', result.error);
      throw new Error(result.error);
    }
  },

  performMove: async () => {
    const handlers = getActionHandlers();
    const result = await handlers.rollMovement();
    if (!result.success) {
      console.error('Failed to roll movement:', result.error);
      throw new Error(result.error);
    }
  },

  performBranchChoice: async (targetNodeId: number) => {
    const handlers = getActionHandlers();
    const result = await handlers.chooseBranch(targetNodeId);
    if (!result.success) {
      console.error('Failed to choose branch:', result.error);
      throw new Error(result.error);
    }
  },

  performDuelOffer: async (targetUid: string) => {
    const handlers = getActionHandlers();
    const result = await handlers.offerDuel(targetUid);
    if (!result.success) {
      console.error('Failed to offer duel:', result.error);
      throw new Error(result.error);
    }
  },

  performRetreat: async () => {
    const handlers = getActionHandlers();
    const result = await handlers.retreat();
    if (!result.success) {
      console.error('Failed to retreat:', result.error);
      throw new Error(result.error);
    }
  },

  performEndTurn: async () => {
    const handlers = getActionHandlers();
    const result = await handlers.endTurn();
    if (!result.success) {
      console.error('Failed to end turn:', result.error);
      throw new Error(result.error);
    }
  },

  performContinue: async () => {
    const handlers = getActionHandlers();
    const result = await handlers.continuePhase();
    if (!result.success) {
      console.error('Failed to continue:', result.error);
      throw new Error(result.error);
    }
  },
}));