import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { BOARD } from '../../data/content';

interface BranchDialogProps {
  options: number[];
  remainingSteps: number;
  onChoice: (nodeId: number) => void;
}

export function BranchDialog({ options, remainingSteps, onChoice }: BranchDialogProps) {
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedPath !== null) {
      onChoice(selectedPath);
    }
  };

  // Get tile information for each option
  const tileInfo = options.map(nodeId => {
    const tile = BOARD.tiles.find(t => t.id === nodeId);
    return {
      nodeId,
      tile,
      name: tile?.name || `Tile ${nodeId}`,
      type: tile?.type || 'unknown'
    };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Choose Your Path
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You have {remainingSteps} step{remainingSteps !== 1 ? 's' : ''} remaining.
          Choose which path to take:
        </p>

        <div className="space-y-2 mb-6">
          {tileInfo.map(({ nodeId, name, type }) => (
            <button
              key={nodeId}
              onClick={() => setSelectedPath(nodeId)}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${
                selectedPath === nodeId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{name}</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  type === 'enemy' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  type === 'treasure' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  type === 'chance' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  type === 'sanctuary' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {type}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={selectedPath === null}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Confirm Path
          </button>
        </div>
      </div>
    </div>
  );
}