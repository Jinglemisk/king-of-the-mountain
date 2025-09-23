// /src/game/engine/board.ts
// Board graph implementation with validation and traversal utilities

import { BoardGraph, BoardNode, NodeId, TileType, Tier } from '../types';
import boardDataV1 from '../data/board.v1.json';

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
}

export interface BoardGraphExtended extends BoardGraph {
  reverseAdj: Map<NodeId, NodeId[]>;
}

export function loadBoard(boardId: 'board.v1' = 'board.v1'): BoardGraphExtended {
  const boardData = boardDataV1 as any;

  if (boardData.id !== boardId) {
    throw new Error(`Board ID mismatch: expected ${boardId}, got ${boardData.id}`);
  }

  const validation = validateBoard(boardData);
  if (!validation.ok) {
    throw new Error(`Board validation failed: ${validation.errors?.join(', ')}`);
  }

  const reverseAdj = buildReverseAdjacency(boardData);

  return {
    ...boardData,
    reverseAdj
  } as BoardGraphExtended;
}

export function validateBoard(board: any): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!board.id || !board.boardSchemaVersion || !Array.isArray(board.nodes)) {
    errors.push('Missing required fields: id, boardSchemaVersion, or nodes');
    return { ok: false, errors };
  }

  if (board.boardSchemaVersion !== 1) {
    errors.push(`Unsupported schema version: ${board.boardSchemaVersion}`);
  }

  if (board.nodes.length === 0) {
    errors.push('Board must have at least one node');
    return { ok: false, errors };
  }

  const nodeIds = new Set<number>();
  const nodeMap = new Map<number, any>();
  let hasStart = false;
  let hasFinal = false;

  // First pass: collect all nodes and check for duplicates
  for (const node of board.nodes) {
    if (!Number.isInteger(node.id) || node.id < 0) {
      errors.push(`Invalid node ID: ${node.id}`);
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    } else {
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);
    }

    // Check tile type
    const validTypes = ['start', 'final', 'empty', 'chance', 'treasure', 'enemy', 'sanctuary'];
    if (!validTypes.includes(node.type)) {
      errors.push(`Invalid tile type '${node.type}' for node ${node.id}`);
    }

    // Check start and final
    if (node.type === 'start') {
      if (node.id !== 0) {
        errors.push(`Start node must have ID 0, got ${node.id}`);
      }
      hasStart = true;
    }
    if (node.type === 'final') {
      if (node.neighbors && node.neighbors.length > 0) {
        errors.push(`Final node ${node.id} must have empty neighbors array`);
      }
      hasFinal = true;
    }

    // Check tier requirements
    if (node.type === 'enemy' || node.type === 'treasure') {
      if (!node.tier || ![1, 2, 3].includes(node.tier)) {
        errors.push(`Node ${node.id} (${node.type}) must have tier 1, 2, or 3`);
      }
    } else if (node.tier !== undefined) {
      errors.push(`Node ${node.id} (${node.type}) should not have tier`);
    }

    // Check neighbors
    if (!Array.isArray(node.neighbors)) {
      errors.push(`Node ${node.id} must have neighbors array`);
    }
  }

  if (!hasStart) {
    errors.push('Board must have exactly one start node (ID 0)');
  }
  if (!hasFinal) {
    errors.push('Board must have exactly one final node');
  }

  // Second pass: validate neighbor references
  for (const node of board.nodes) {
    if (!node.neighbors) continue;

    for (const neighborId of node.neighbors) {
      if (!nodeMap.has(neighborId)) {
        errors.push(`Node ${node.id} references non-existent neighbor ${neighborId}`);
      }

      // Check for self-loops
      if (neighborId === node.id) {
        errors.push(`Node ${node.id} has self-loop`);
      }
    }

    // Check for duplicate neighbors
    const uniqueNeighbors = new Set(node.neighbors);
    if (uniqueNeighbors.size !== node.neighbors.length) {
      errors.push(`Node ${node.id} has duplicate neighbors`);
    }
  }

  // Check DAG property (no cycles) and reachability
  const visited = new Set<number>();
  const recStack = new Set<number>();

  function hasCycle(nodeId: number): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (node && node.neighbors) {
      for (const neighborId of node.neighbors) {
        if (!visited.has(neighborId)) {
          if (hasCycle(neighborId)) return true;
        } else if (recStack.has(neighborId)) {
          return true;
        }
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  // Start from node 0 (start)
  if (nodeMap.has(0) && hasCycle(0)) {
    errors.push('Board contains cycles (not a DAG)');
  }

  // Check reachability from start
  const reachable = new Set<number>();
  function markReachable(nodeId: number) {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (node && node.neighbors) {
      for (const neighborId of node.neighbors) {
        markReachable(neighborId);
      }
    }
  }

  if (nodeMap.has(0)) {
    markReachable(0);

    // Check if all nodes are reachable
    for (const nodeId of nodeIds) {
      if (!reachable.has(nodeId)) {
        errors.push(`Node ${nodeId} is not reachable from start`);
      }
    }

    // Check if final is reachable
    const finalNode = Array.from(nodeMap.values()).find(n => n.type === 'final');
    if (finalNode && !reachable.has(finalNode.id)) {
      errors.push('Final node is not reachable from start');
    }
  }

  return {
    ok: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function buildReverseAdjacency(board: BoardGraph): Map<NodeId, NodeId[]> {
  const reverseAdj = new Map<NodeId, NodeId[]>();

  // Initialize empty arrays for all nodes
  for (const node of board.nodes) {
    reverseAdj.set(node.id, []);
  }

  // Build reverse edges
  for (const node of board.nodes) {
    for (const neighborId of node.neighbors) {
      const preds = reverseAdj.get(neighborId);
      if (preds) {
        preds.push(node.id);
      }
    }
  }

  // Sort predecessors for deterministic traversal
  for (const [nodeId, preds] of reverseAdj) {
    preds.sort((a, b) => a - b);
  }

  return reverseAdj;
}

export function getTileNode(board: BoardGraph, nodeId: NodeId): BoardNode | undefined {
  return board.nodes.find(node => node.id === nodeId);
}

export function getNeighbors(board: BoardGraph, nodeId: NodeId): NodeId[] {
  const node = getTileNode(board, nodeId);
  return node ? [...node.neighbors] : [];
}

export function getPredecessors(board: BoardGraphExtended, nodeId: NodeId): NodeId[] {
  return board.reverseAdj.get(nodeId) || [];
}

export function isValidPath(board: BoardGraph, from: NodeId, to: NodeId): boolean {
  const node = getTileNode(board, from);
  return node ? node.neighbors.includes(to) : false;
}