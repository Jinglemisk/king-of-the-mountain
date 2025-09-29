import type { GamePhase } from '../../types';

interface PhaseInfo {
  displayName: string;
  description: string;
  icon: string;
  actionPrompt?: string;
}

export const phaseDescriptions: Record<GamePhase, PhaseInfo> = {
  turnStart: {
    displayName: 'Turn Beginning',
    description: 'Preparing for your turn',
    icon: '🎯',
    actionPrompt: 'Click Continue to proceed'
  },
  manage: {
    displayName: 'Equipment Management',
    description: 'Swap or manage your equipment before moving',
    icon: '🎒',
    actionPrompt: 'Swap equipment or click Continue when ready'
  },
  preDuel: {
    displayName: 'Challenge Phase',
    description: 'Opportunity to challenge co-located players to a duel',
    icon: '⚔️',
    actionPrompt: 'Offer a duel or click Continue to skip'
  },
  moveOrSleep: {
    displayName: 'Action Decision',
    description: 'Choose to move forward or rest to heal',
    icon: '🎲',
    actionPrompt: 'Choose Move (roll d4) or Sleep (heal to full HP)'
  },
  resolveTile: {
    displayName: 'Tile Resolution',
    description: 'Resolving the effects of your current tile',
    icon: '📍',
    actionPrompt: 'Tile effects are being resolved...'
  },
  combat: {
    displayName: 'Combat Encounter',
    description: 'Fighting an enemy on this tile',
    icon: '⚔️',
    actionPrompt: 'Fight or Retreat (move back 6 tiles)'
  },
  duel: {
    displayName: 'Player Duel',
    description: 'Engaged in combat with another player',
    icon: '🤺',
    actionPrompt: 'Fight or Retreat'
  },
  postCombat: {
    displayName: 'Battle Aftermath',
    description: 'Collect loot and manage inventory after combat',
    icon: '💰',
    actionPrompt: 'Pick up items or drop excess equipment'
  },
  capacity: {
    displayName: 'Inventory Check',
    description: 'Manage your inventory capacity',
    icon: '📦',
    actionPrompt: 'Drop items if over capacity, then End Turn'
  },
  endTurn: {
    displayName: 'Turn Completion',
    description: 'Finalizing your turn',
    icon: '✅',
    actionPrompt: 'Click End Turn to finish'
  },
  finalTieBreaker: {
    displayName: 'Final Showdown',
    description: 'Multiple players reached the final tile - duel for victory!',
    icon: '🏆',
    actionPrompt: 'Prepare for the final duel!'
  }
};

export function getPhaseInfo(phase: GamePhase): PhaseInfo {
  return phaseDescriptions[phase] || {
    displayName: phase,
    description: '',
    icon: '❓'
  };
}

export function getPhaseProgress(phase: GamePhase): number {
  const phaseOrder: GamePhase[] = [
    'turnStart',
    'manage',
    'preDuel',
    'moveOrSleep',
    'resolveTile',
    'combat',
    'duel',
    'postCombat',
    'capacity',
    'endTurn',
    'finalTieBreaker'
  ];

  const index = phaseOrder.indexOf(phase);
  if (index === -1) return 0;

  // Calculate progress (excluding optional phases like combat/duel)
  const mainPhases = ['turnStart', 'manage', 'preDuel', 'moveOrSleep', 'resolveTile', 'capacity', 'endTurn'];
  const mainIndex = mainPhases.indexOf(phase);

  if (mainIndex !== -1) {
    return (mainIndex / (mainPhases.length - 1)) * 100;
  }

  // For combat/duel phases, show as 60% (between resolveTile and capacity)
  if (phase === 'combat' || phase === 'duel' || phase === 'postCombat') {
    return 60;
  }

  // Final tie breaker is 100%
  if (phase === 'finalTieBreaker') {
    return 100;
  }

  return 50;
}