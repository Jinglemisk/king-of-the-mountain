import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { BOARD } from '../../data/content';

interface TilePosition {
  x: number;
  y: number;
}

const TILE_SIZE = 72;
const HALF_TILE = TILE_SIZE / 2;
const CANVAS_SIZE = 900;
const MAP_PADDING = 120;
const FINAL_TILE_ID = 53;

const BRANCH_DEFINITIONS = [
  { startId: 10, endId: 18, nodeIds: [54, 55, 56, 57, 58, 59], arcDirection: -1 },
  { startId: 36, endId: 46, nodeIds: [60, 61, 62, 63, 64, 65, 66, 67], arcDirection: 1 },
];

export function BoardCanvas() {
  const { gameState, myUid, ui, setHoveredTile } = useGameStore();

  const mapCenter = CANVAS_SIZE / 2;
  const outerRadius = mapCenter - MAP_PADDING;
  const innerRadius = TILE_SIZE * 0.85;

  // Calculate tile positions for rendering
  const tilePositions = useMemo(() => {
    const positions: Record<number, TilePosition> = {};

    const mainPathTiles = BOARD.tiles
      .filter((tile) => tile.id <= FINAL_TILE_ID)
      .sort((a, b) => a.id - b.id);

    // Plot the main path along a gentle spiral that coils toward the summit.
    const angleStep = Math.PI / 6;
    mainPathTiles.forEach((tile, index) => {
      const progress = mainPathTiles.length > 1 ? index / (mainPathTiles.length - 1) : 0;
      const radius = outerRadius - progress * (outerRadius - innerRadius);
      const angle = -Math.PI / 2 + angleStep * index;
      const centerX = mapCenter + radius * Math.cos(angle);
      const centerY = mapCenter + radius * Math.sin(angle);

      positions[tile.id] = {
        x: centerX - HALF_TILE,
        y: centerY - HALF_TILE,
      };
    });

    positions[FINAL_TILE_ID] = {
      x: mapCenter - HALF_TILE,
      y: mapCenter - HALF_TILE,
    };

    // Place shortcut branches along curved chords between their entry and exit tiles.
    const placeBranch = (
      startId: number,
      endId: number,
      nodeIds: number[],
      arcDirection: number,
    ) => {
      const start = positions[startId];
      const end = positions[endId];
      if (!start || !end) return;

      const startX = start.x + HALF_TILE;
      const startY = start.y + HALF_TILE;
      const endX = end.x + HALF_TILE;
      const endY = end.y + HALF_TILE;
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.hypot(dx, dy) || 1;
      const segmentX = dx / (nodeIds.length + 1);
      const segmentY = dy / (nodeIds.length + 1);
      const normalX = (-dy / distance) * arcDirection;
      const normalY = (dx / distance) * arcDirection;
      const bulge = Math.min(distance * 0.35, 160);

      nodeIds.forEach((nodeId, branchIndex) => {
        const step = branchIndex + 1;
        const baseX = startX + segmentX * step;
        const baseY = startY + segmentY * step;
        const curvature = Math.sin((Math.PI * step) / (nodeIds.length + 1)) * bulge;

        positions[nodeId] = {
          x: baseX + normalX * curvature - HALF_TILE,
          y: baseY + normalY * curvature - HALF_TILE,
        };
      });
    };

    BRANCH_DEFINITIONS.forEach(({ startId, endId, nodeIds, arcDirection }) => {
      placeBranch(startId, endId, nodeIds, arcDirection);
    });

    return positions;
  }, []);

  const connectionPaths = useMemo(() => {
    const segments: { key: string; d: string }[] = [];
    const seen = new Set<string>();

    // Curved connectors feel more like trails on a map than straight lines.
    BOARD.tiles.forEach((tile) => {
      const from = tilePositions[tile.id];
      if (!from) return;

      const fromX = from.x + HALF_TILE;
      const fromY = from.y + HALF_TILE;

      tile.neighbors.forEach((neighborId) => {
        const key = tile.id < neighborId ? `${tile.id}-${neighborId}` : `${neighborId}-${tile.id}`;
        if (seen.has(key)) return;

        const to = tilePositions[neighborId];
        if (!to) return;

        seen.add(key);

        const toX = to.x + HALF_TILE;
        const toY = to.y + HALF_TILE;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.hypot(dx, dy) || 1;
        const midX = fromX + dx / 2;
        const midY = fromY + dy / 2;
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const curve = Math.min(distance * 0.18, 70);
        const controlX = midX + normalX * curve;
        const controlY = midY + normalY * curve;

        segments.push({
          key,
          d: `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`,
        });
      });
    });

    return segments;
  }, [tilePositions]);

  const getTileClasses = (type: string) => {
    switch (type) {
      case 'enemy':
        return 'bg-gradient-to-br from-danger-700 via-danger-600 to-danger-500 border-danger-300/40 shadow-[0_16px_30px_rgba(220,38,38,0.35)]';
      case 'treasure':
        return 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-yellow-200/40 shadow-[0_16px_30px_rgba(234,179,8,0.35)] text-gray-900';
      case 'chance':
        return 'bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 border-purple-200/40 shadow-[0_16px_30px_rgba(147,51,234,0.4)]';
      case 'sanctuary':
        return 'bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-300 border-emerald-100/40 shadow-[0_16px_30px_rgba(16,185,129,0.35)] text-gray-900';
      case 'start':
        return 'bg-gradient-to-br from-sky-500 via-sky-400 to-sky-300 border-sky-100/40 shadow-[0_16px_30px_rgba(14,165,233,0.35)] text-gray-900';
      case 'final':
        return 'bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 border-yellow-100/40 shadow-[0_20px_40px_rgba(245,158,11,0.45)] text-gray-900';
      case 'empty':
      default:
        return 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 border-slate-200/30 shadow-[0_16px_30px_rgba(148,163,184,0.35)]';
    }
  };

  const getTileIcon = (type: string) => {
    switch (type) {
      case 'enemy': return '⚔️';
      case 'treasure': return '💰';
      case 'chance': return '🎲';
      case 'sanctuary': return '🛡️';
      case 'empty': return '';
      case 'start': return '🏁';
      case 'final': return '👑';
      default: return '';
    }
  };

  const getPlayerTokens = (tileId: number) => {
    if (!gameState) return [];
    return Object.entries(gameState.players)
      .filter(([_, player]) => player.position === tileId)
      .map(([uid, player]) => ({
        uid,
        nickname: player.nickname || 'Player',
        isMe: uid === myUid,
        hp: player.hp,
        maxHp: player.maxHp,
      }));
  };

  const handleTileClick = (tileId: number) => {
    // Handle branch choice if active
    if (ui.branchOptions?.includes(tileId)) {
      // Dispatch branch choice action
      console.log('Choose branch:', tileId);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-surface-base via-surface-sunken to-surface-base py-6">
      <div
        className="relative mx-auto"
        style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[48px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(244,241,222,0.35)_0%,_rgba(134,180,162,0.25)_55%,_rgba(11,17,32,0.8)_100%)] shadow-[0_45px_80px_-45px_rgba(8,47,73,0.7)]"
        />

        <div className="pointer-events-none absolute inset-8 rounded-[40px] border border-white/8 bg-white/3 backdrop-blur-sm" />

        <svg
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          className="absolute inset-0 pointer-events-none"
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(191,219,254,0.9)" />
              <stop offset="100%" stopColor="rgba(248,250,252,0.7)" />
            </linearGradient>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {Array.from({ length: 6 }).map((_, idx) => {
            const radius = outerRadius - (idx * (outerRadius - innerRadius)) / 6;
            return (
              <circle
                key={`contour-${idx}`}
                cx={mapCenter}
                cy={mapCenter}
                r={Math.max(radius, 40)}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={idx % 2 === 0 ? 1.2 : 0.8}
                strokeDasharray={idx % 2 === 0 ? '12 14' : '8 10'}
              />
            );
          })}

          {connectionPaths.map(({ key, d }) => (
            <g key={key}>
              <path
                d={d}
                fill="none"
                stroke="rgba(11,17,32,0.8)"
                strokeWidth={12}
                strokeLinecap="round"
                opacity={0.9}
              />
              <path
                d={d}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.95}
              />
            </g>
          ))}

          {Object.entries(tilePositions).map(([tileId, position]) => (
            <circle
              key={`glow-${tileId}`}
              cx={position.x + HALF_TILE}
              cy={position.y + HALF_TILE}
              r={HALF_TILE}
              fill="url(#nodeGlow)"
              opacity={0.35}
            />
          ))}
        </svg>

        {BOARD.tiles.map((tile) => {
          const pos = tilePositions[tile.id];
          if (!pos) return null;

          const tokens = getPlayerTokens(tile.id);
          const isHovered = ui.hoveredTile === tile.id;
          const isBranchOption = ui.branchOptions?.includes(tile.id);
          const tileLabel = `${tile.type.charAt(0).toUpperCase()}${tile.type.slice(1)}`;

          return (
            <div
              key={tile.id}
              className={`
                absolute flex flex-col cursor-pointer rounded-2xl border
                text-white transition-transform duration-200 ease-out
                ${getTileClasses(tile.type)}
                ${isHovered ? 'scale-110 z-20 drop-shadow-2xl' : 'z-10'}
                ${isBranchOption ? 'ring-4 ring-yellow-200/70 animate-pulse-glow' : ''}
              `}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
              }}
              onClick={() => handleTileClick(tile.id)}
              onMouseEnter={() => setHoveredTile(tile.id)}
              onMouseLeave={() => setHoveredTile(null)}
              data-testid={`tile-${tile.id}`}
            >
              <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center">
                <div className="absolute -top-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
                  #{tile.id}
                </div>

                <div className="text-3xl drop-shadow">{getTileIcon(tile.type)}</div>

                <div className="absolute bottom-1 left-1 right-1 text-center text-[10px] font-semibold uppercase tracking-wide text-black/70">
                  {tileLabel}
                </div>

                {tile.tier && (
                  <div className="absolute top-1 right-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                    T{tile.tier}
                  </div>
                )}

                {gameState?.tileState?.traps?.[tile.id] && (
                  <div className="absolute top-8 right-1 text-xs">🪤</div>
                )}
                {gameState?.tileState?.ambushes?.[tile.id] && (
                  <div className="absolute top-8 right-1 text-xs">👤</div>
                )}
              </div>

              {tokens.length > 0 && (
                <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                  {tokens.map((token) => (
                    <div
                      key={token.uid}
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold
                        ${token.isMe
                          ? 'bg-sky-500 text-white ring-2 ring-sky-200/70'
                          : 'bg-slate-800/90 text-white'}
                        ${token.hp <= 1 ? 'opacity-60' : ''}
                      `}
                      title={`${token.nickname} (${token.hp}/${token.maxHp} HP)`}
                    >
                      {token.nickname[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute bottom-8 left-8 rounded-2xl bg-white/80 px-5 py-4 text-xs text-slate-900 shadow-lg">
          <h3 className="mb-3 font-semibold uppercase tracking-wide">Legend</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-danger-500" />
              <span>Enemy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span>Treasure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              <span>Chance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span>Sanctuary</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-400" />
              <span>Start</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span>Final</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
