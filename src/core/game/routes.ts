import type {
  GameRunMapNode,
  GameRunMapState,
  GameMapNodeKind,
  GameRouteNodeKind,
  GameRunRouteLink,
  GameRunRouteChoice,
  GameRunRouteState,
} from '../../shared/types';
import { BOSS_LEVEL_INTERVAL, isBossLevel } from './runUtils';
import { i18n, sanitizeTranslationParams } from '../i18n';

type CreateGameRouteArgs = {
  level: number;
  lives: number;
  maxLives: number;
  hasRepairTargets: boolean;
};

function createRouteId(level: number) {
  return `route-${level}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function t(key: string, params?: Record<string, string | number>) {
  return i18n.t(key, sanitizeTranslationParams(params)) as string;
}

function createChoice(
  id: string,
  kind: GameRouteNodeKind,
  title: string,
  flavor: string,
  description: string,
  lane: number,
  column: number,
): GameRunRouteChoice {
  return {
    id,
    kind,
    title,
    flavor,
    description,
    lane,
    column,
  };
}

export function shouldOfferGameRoute(level: number) {
  return level > 0 && level % 2 === 0 && level % 5 !== 0;
}

export function getRouteKindLabel(kind: GameRouteNodeKind) {
  if (kind === 'battle') return t('game.core.routes.kind.battle');
  if (kind === 'rest') return t('game.core.routes.kind.rest');
  if (kind === 'treasure') return t('game.core.routes.kind.treasure');
  if (kind === 'shop') return t('game.core.routes.kind.shop');
  if (kind === 'elite') return t('game.core.routes.kind.elite');
  if (kind === 'miniboss') return t('game.core.routes.kind.miniboss');
  return t('game.core.routes.kind.risk');
}

export function getMapKindLabel(kind: GameRunMapNode['kind']) {
  if (kind === 'boss') return t('game.core.routes.kind.boss');
  return getRouteKindLabel(kind);
}

function buildRouteNode(
  kind: GameRouteNodeKind,
  lane: number,
  column: number,
): GameRunRouteChoice {
  const id = `route-${column}-${lane}-${kind}`;
  if (kind === 'battle') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.battle.title'),
      t('game.core.routes.routeNode.battle.flavor'),
      t('game.core.routes.routeNode.battle.description'),
      lane,
      column,
    );
  }
  if (kind === 'rest') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.rest.title'),
      t('game.core.routes.routeNode.rest.flavor'),
      t('game.core.routes.routeNode.rest.description'),
      lane,
      column,
    );
  }
  if (kind === 'treasure') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.treasure.title'),
      t('game.core.routes.routeNode.treasure.flavor'),
      t('game.core.routes.routeNode.treasure.description'),
      lane,
      column,
    );
  }
  if (kind === 'shop') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.shop.title'),
      t('game.core.routes.routeNode.shop.flavor'),
      t('game.core.routes.routeNode.shop.description'),
      lane,
      column,
    );
  }
  if (kind === 'elite') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.elite.title'),
      t('game.core.routes.routeNode.elite.flavor'),
      t('game.core.routes.routeNode.elite.description'),
      lane,
      column,
    );
  }
  if (kind === 'miniboss') {
    return createChoice(
      id,
      kind,
      t('game.core.routes.routeNode.miniboss.title'),
      t('game.core.routes.routeNode.miniboss.flavor'),
      t('game.core.routes.routeNode.miniboss.description'),
      lane,
      column,
    );
  }
  return createChoice(
    id,
    kind,
    t('game.core.routes.routeNode.risk.title'),
    t('game.core.routes.routeNode.risk.flavor'),
    t('game.core.routes.routeNode.risk.description'),
    lane,
    column,
  );
}

function buildRouteLinks(nodes: GameRunRouteChoice[]): GameRunRouteLink[] {
  const links: GameRunRouteLink[] = [];
  const maxColumn = Math.max(...nodes.map(node => node.column));

  for (let column = 0; column < maxColumn; column += 1) {
    const current = nodes.filter(node => node.column === column);
    const next = nodes.filter(node => node.column === column + 1);
    if (!next.length) continue;

    current.forEach(fromNode => {
      const adjacent = next.filter(toNode => Math.abs(toNode.lane - fromNode.lane) <= 1);
      if (adjacent.length > 0) {
        adjacent.forEach(toNode => {
          links.push({ fromId: fromNode.id, toId: toNode.id });
        });
      } else {
        // Fallback: connect to the closest node in the next column so there are no dead-ends
        const closest = next.reduce((best, candidate) => (
          Math.abs(candidate.lane - fromNode.lane) < Math.abs(best.lane - fromNode.lane) ? candidate : best
        ), next[0]);
        links.push({ fromId: fromNode.id, toId: closest.id });
      }
    });

    // Ensure every next-column node has at least one incoming link
    next.forEach(toNode => {
      const hasIncoming = links.some(link => link.toId === toNode.id && current.some(c => c.id === link.fromId));
      if (!hasIncoming) {
        const closest = current.reduce((best, candidate) => (
          Math.abs(candidate.lane - toNode.lane) < Math.abs(best.lane - toNode.lane) ? candidate : best
        ), current[0]);
        links.push({ fromId: closest.id, toId: toNode.id });
      }
    });
  }

  return links;
}

function createSeededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomFrom<T>(items: T[], random: () => number = Math.random) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function createMapNode(
  id: string,
  kind: GameRunMapNode['kind'],
  column: number,
  lane: number,
  battleLevel: number | null = null,
): GameRunMapNode {
  if (kind === 'boss') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.boss.title'),
      flavor: t('game.core.routes.mapNode.boss.flavor'),
      description: t('game.core.routes.mapNode.boss.description', { interval: BOSS_LEVEL_INTERVAL }),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'battle' && battleLevel != null) {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.battleEncounter.title'),
      flavor: t('game.core.routes.mapNode.battleEncounter.flavor'),
      description: t('game.core.routes.mapNode.battleEncounter.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'battle') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.battle.title'),
      flavor: t('game.core.routes.mapNode.battle.flavor'),
      description: t('game.core.routes.mapNode.battle.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'rest') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.rest.title'),
      flavor: t('game.core.routes.mapNode.rest.flavor'),
      description: t('game.core.routes.mapNode.rest.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'treasure') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.treasure.title'),
      flavor: t('game.core.routes.mapNode.treasure.flavor'),
      description: t('game.core.routes.mapNode.treasure.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'shop') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.shop.title'),
      flavor: t('game.core.routes.mapNode.shop.flavor'),
      description: t('game.core.routes.mapNode.shop.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'elite') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.elite.title'),
      flavor: t('game.core.routes.mapNode.elite.flavor'),
      description: t('game.core.routes.mapNode.elite.description'),
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'miniboss') {
    return {
      id,
      kind,
      title: t('game.core.routes.mapNode.miniboss.title'),
      flavor: t('game.core.routes.mapNode.miniboss.flavor'),
      description: t('game.core.routes.mapNode.miniboss.description'),
      column,
      lane,
      battleLevel,
    };
  }

  return {
    id,
    kind,
    title: t('game.core.routes.mapNode.risk.title'),
    flavor: t('game.core.routes.mapNode.risk.flavor'),
    description: t('game.core.routes.mapNode.risk.description'),
    column,
    lane,
    battleLevel,
  };
}

/**
 * Pick a random node kind for a segment column.
 * The node kind pool depends on progression and the lane.
 */
function getSegmentNodeKind(
  bossLevel: number,
  lane: number,
  colIndex: number,
  totalCols: number,
  random: () => number,
): GameMapNodeKind {
  const canElite = bossLevel >= 10;
  const canMiniboss = bossLevel >= 15;

  // First column after boss leans toward battles; last column leans toward events
  const isFirstCol = colIndex === 0;
  const isLastCol = colIndex === totalCols - 1;

  const pool: GameMapNodeKind[] = [];

  if (isFirstCol) {
    pool.push('battle', 'battle', 'battle');
    if (canElite) pool.push('elite');
    pool.push('treasure');
  } else if (isLastCol) {
    pool.push('rest', 'treasure', 'shop');
    pool.push('risk');
  } else {
    pool.push('battle', 'battle');
    pool.push(lane === 1 ? 'battle' : 'treasure');
    pool.push(bossLevel % 4 === 0 ? 'shop' : 'treasure');
    pool.push(bossLevel % 3 === 0 ? 'risk' : 'rest');
    if (canMiniboss && bossLevel % 7 === 0 && lane === 0) pool.push('miniboss');
    if (canElite && lane !== 1) pool.push('elite');
  }

  return randomFrom(pool, random);
}

/**
 * Determine how many branches (lanes) a segment between two bosses should have.
 */
function getSegmentBranchCount(bossLevel: number): number {
  if (bossLevel >= 60) return randomFrom([2, 2, 3, 3]);
  if (bossLevel >= 30) return randomFrom([2, 2, 3]);
  if (bossLevel >= 15) return randomFrom([2, 2, 2, 3]);
  return randomFrom([2, 2]);
}

/**
 * Determine how many intermediate columns to place between bosses.
 * This is the number of columns BETWEEN the boss-start and the next boss.
 * (Battles within these columns count as the non-boss fights.)
 */
function getSegmentDepth(bossLevel: number, random: () => number): number {
  if (bossLevel >= 60) return randomFrom([3, 3, 4, 4, 5], random);
  if (bossLevel >= 30) return randomFrom([2, 3, 3, 4], random);
  if (bossLevel >= 15) return randomFrom([2, 2, 3, 3], random);
  return randomFrom([2, 2, 3], random);
}

/**
 * Assign a battle level to a node if it's a combat kind.
 * Battle levels within a segment are distributed among the
 * non-boss levels that belong to this segment.
 */
function isCombatKind(kind: GameMapNodeKind): boolean {
  return kind === 'battle' || kind === 'elite' || kind === 'miniboss';
}

/* ══════════════════════════════════════════════════════════
   Map generation — Slay-the-Spire-style branching graph.

   Shape of one *segment* (between two bosses):

       [start]               ← 1 node (previous boss or level-1 battle)
          │
        ┌─┼─┐                ← expansion: 2-4 nodes
        ├─┼─┤  … columns …   ← middle columns: 3-5 nodes, cross-linked
        └─┼─┘                ← contraction: 2-3 nodes
          │
       [boss]                ← 1 node

   Cross-links between adjacent columns create the "diamond mesh" feel:
     each node connects to 1-3 nodes in the next column,
     preferring same lane ± 1 but sometimes crossing further.
   ══════════════════════════════════════════════════════════ */

export function createGameRunMap(totalLevels: number, seed = `game-map:${totalLevels}`): GameRunMapState {
  const random = createSeededRandom(seed);
  const nodes: GameRunMapNode[] = [];
  const links: GameRunRouteLink[] = [];
  let currentColumn = 0;

  // ── Start node: level 1 battle ──
  const startId = 'battle-1';
  nodes.push(createMapNode(startId, 'battle', currentColumn, 2, 1));
  currentColumn += 1;

  const totalBosses = Math.floor(totalLevels / BOSS_LEVEL_INTERVAL);

  for (let bossIdx = 1; bossIdx <= totalBosses; bossIdx += 1) {
    const bossLevel = bossIdx * BOSS_LEVEL_INTERVAL;
    const prevBossLevel = (bossIdx - 1) * BOSS_LEVEL_INTERVAL;
    const prevNodeIds: string[] =
      bossIdx === 1 ? [startId] : [`boss-${prevBossLevel}`];

    // Non-boss levels within this segment
    const segBattleLevels: number[] = [];
    for (let lvl = prevBossLevel + (bossIdx === 1 ? 2 : 1); lvl < bossLevel; lvl += 1) {
      segBattleLevels.push(lvl);
    }

    // Number of intermediate columns
    const depth = getSegmentDepth(bossLevel, random);
    const maxLanes = 5; // lanes 0..4

    // Build width profile: how many nodes in each column (diamond shape)
    const widths: number[] = [];
    for (let col = 0; col < depth; col += 1) {
      const t = depth <= 1 ? 0.5 : col / (depth - 1); // 0..1
      // Diamond: width peaks in the middle
      const peak = getSegmentPeakWidth(bossLevel, random);
      const edge = bossIdx === 1 && col === 0 ? 2 : 2; // start/end narrower
      const w = Math.round(edge + (peak - edge) * Math.sin(t * Math.PI));
      widths.push(Math.max(2, Math.min(maxLanes, w)));
    }

    // For each column, pick lane positions (spread evenly)
    const columnLanes: number[][] = widths.map(w => spreadLanes(w, maxLanes));

    // Assign battle levels round-robin to combat nodes
    let battleLevelCursor = 0;

    // Create nodes for each column
    const columnNodeIds: string[][] = [];

    for (let col = 0; col < depth; col += 1) {
      const lanes = columnLanes[col];
      const colNodeIds: string[] = [];
      for (const lane of lanes) {
        const kind = getSegmentNodeKind(bossLevel, lane, col, depth, random);
        let battleLevel: number | null = null;
        if (isCombatKind(kind) && battleLevelCursor < segBattleLevels.length) {
          battleLevel = segBattleLevels[battleLevelCursor];
          battleLevelCursor += 1;
        }
        const nodeId = `seg-${bossLevel}-c${col}-l${lane}`;
        nodes.push(createMapNode(nodeId, kind, currentColumn + col, lane, battleLevel));
        colNodeIds.push(nodeId);
      }
      columnNodeIds.push(colNodeIds);
    }

    // ── Wire up links ──
    // Connect previous boss / start → first column
    const firstColNodes = columnNodeIds[0] ?? [];
    for (const prevId of prevNodeIds) {
      for (const toId of firstColNodes) {
        links.push({ fromId: prevId, toId });
      }
    }

    // Connect adjacent columns with lane-proximity links
    for (let col = 0; col < depth - 1; col += 1) {
      const fromLanes = columnLanes[col];
      const toLanes = columnLanes[col + 1];
      const fromIds = columnNodeIds[col];
      const toIds = columnNodeIds[col + 1];

      connectColumnsWithMesh(fromLanes, fromIds, toLanes, toIds, links, random);
    }

    // Connect last column → boss
    const bossId = `boss-${bossLevel}`;
    const lastColIds = columnNodeIds[depth - 1] ?? [];
    for (const fromId of lastColIds) {
      links.push({ fromId, toId: bossId });
    }

    // Boss node
    nodes.push(createMapNode(bossId, 'boss', currentColumn + depth, 2, bossLevel));
    currentColumn += depth + 1;
  }

  // ── Post-boss tail (if totalLevels is not a multiple of BOSS_LEVEL_INTERVAL) ──
  const lastBossLevel = totalBosses * BOSS_LEVEL_INTERVAL;
  if (lastBossLevel < totalLevels) {
    const lastBossId = totalBosses > 0 ? `boss-${lastBossLevel}` : startId;
    let prevId = lastBossId;
    for (let lvl = lastBossLevel + 1; lvl <= totalLevels; lvl += 1) {
      const nodeId = `battle-${lvl}`;
      nodes.push(createMapNode(nodeId, 'battle', currentColumn, 2, lvl));
      links.push({ fromId: prevId, toId: nodeId });
      prevId = nodeId;
      currentColumn += 1;
    }
  }

  // ── Final convergence node ──
  const maxCol = Math.max(...nodes.map(n => n.column));
  const finalNodes = nodes.filter(n => n.column === maxCol);
  if (finalNodes.length > 1) {
    // Already converges to one — no extra node needed
  }
  // Always add a finish node so all paths converge
  const finishId = 'finish';
  nodes.push(createMapNode(finishId, 'boss', maxCol + 1, 2, totalLevels));
  // Connect all leaf nodes to finish
  const outgoing = new Set(links.map(l => l.fromId));
  for (const node of nodes) {
    if (node.id === finishId) continue;
    if (!outgoing.has(node.id)) {
      links.push({ fromId: node.id, toId: finishId });
    }
  }

  // ── Dead-end & dedup safety pass ──
  const finalOutgoing = new Set(links.map(l => l.fromId));
  for (const node of nodes) {
    if (node.id === finishId) continue;
    if (finalOutgoing.has(node.id)) continue;
    const nextCol = nodes.filter(n => n.column === node.column + 1);
    if (nextCol.length > 0) {
      const closest = nextCol.reduce((b, c) =>
        Math.abs(c.lane - node.lane) < Math.abs(b.lane - node.lane) ? c : b, nextCol[0]);
      links.push({ fromId: node.id, toId: closest.id });
    }
  }

  // Deduplicate links
  const uniqueLinks: GameRunRouteLink[] = [];
  const linkKeys = new Set<string>();
  for (const link of links) {
    const key = `${link.fromId}->${link.toId}`;
    if (!linkKeys.has(key)) {
      linkKeys.add(key);
      uniqueLinks.push(link);
    }
  }

  return {
    nodes,
    links: uniqueLinks,
    currentNodeId: startId,
    visitedNodeIds: [startId],
    selectableNodeIds: [],
  };
}

/* ── Helpers for the new map generator ──────────────────── */

/** Peak width for a segment (how wide the diamond gets) */
function getSegmentPeakWidth(bossLevel: number, random: () => number): number {
  if (bossLevel >= 60) return randomFrom([4, 4, 5, 5], random);
  if (bossLevel >= 30) return randomFrom([3, 4, 4, 5], random);
  if (bossLevel >= 15) return randomFrom([3, 3, 4, 4], random);
  return randomFrom([3, 3, 4], random);
}

/** Spread `count` lanes evenly across 0..maxLanes-1 */
function spreadLanes(count: number, maxLanes: number): number[] {
  if (count >= maxLanes) return Array.from({ length: maxLanes }, (_, i) => i);
  if (count === 1) return [Math.floor(maxLanes / 2)];
  const step = (maxLanes - 1) / (count - 1);
  const lanes: number[] = [];
  for (let i = 0; i < count; i += 1) {
    lanes.push(Math.round(i * step));
  }
  return [...new Set(lanes)].sort((a, b) => a - b);
}

/**
 * Connect nodes between two adjacent columns using a "mesh" strategy:
 *   - Each node connects to same-lane ± 1 in the next column
 *   - Occasionally adds cross-links for variety
 *   - Every node gets at least 1 outgoing, every target at least 1 incoming
 */
function connectColumnsWithMesh(
  fromLanes: number[],
  fromIds: string[],
  toLanes: number[],
  toIds: string[],
  links: GameRunRouteLink[],
  random: () => number,
) {
  const incoming = new Set<string>();

  // Phase 1: each from-node connects to closest target(s)
  for (let i = 0; i < fromLanes.length; i += 1) {
    const fLane = fromLanes[i];
    // Find all targets within distance ≤ 1
    const adjacent: number[] = [];
    for (let j = 0; j < toLanes.length; j += 1) {
      if (Math.abs(toLanes[j] - fLane) <= 1) adjacent.push(j);
    }
    // If none within 1, pick closest
    if (adjacent.length === 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < toLanes.length; j += 1) {
        const d = Math.abs(toLanes[j] - fLane);
        if (d < bestDist) { bestDist = d; bestIdx = j; }
      }
      adjacent.push(bestIdx);
    }

    // Always link same-lane (closest), plus randomly add a second link
    for (const j of adjacent) {
      links.push({ fromId: fromIds[i], toId: toIds[j] });
      incoming.add(toIds[j]);
    }

    // 30% chance: add one cross-link to a node at distance 2
    if (random() < 0.3) {
      const far: number[] = [];
      for (let j = 0; j < toLanes.length; j += 1) {
        if (Math.abs(toLanes[j] - fLane) === 2) far.push(j);
      }
      if (far.length > 0) {
        const pick = far[Math.floor(random() * far.length)];
        links.push({ fromId: fromIds[i], toId: toIds[pick] });
        incoming.add(toIds[pick]);
      }
    }
  }

  // Phase 2: ensure every to-node has at least one incoming link
  for (let j = 0; j < toIds.length; j += 1) {
    if (incoming.has(toIds[j])) continue;
    // Connect from closest from-node
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < fromLanes.length; i += 1) {
      const d = Math.abs(fromLanes[i] - toLanes[j]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    links.push({ fromId: fromIds[bestIdx], toId: toIds[j] });
  }
}

export function getGameRunMapNode(map: GameRunMapState | null, nodeId: string | null) {
  if (!map || !nodeId) return null;
  return map.nodes.find(node => node.id === nodeId) ?? null;
}

export function getGameRunMapOutgoingIds(map: GameRunMapState | null, nodeId: string | null) {
  if (!map || !nodeId) return [];
  return map.links.filter(link => link.fromId === nodeId).map(link => link.toId);
}

export function selectGameRunMapNode(
  map: GameRunMapState,
  nodeId: string,
  selectableNodeIds: string[] = [],
): GameRunMapState {
  return {
    ...map,
    currentNodeId: nodeId,
    visitedNodeIds: Array.from(new Set([...map.visitedNodeIds, nodeId])),
    selectableNodeIds,
  };
}

export function setGameRunMapSelectableNodes(
  map: GameRunMapState,
  selectableNodeIds: string[],
): GameRunMapState {
  const validNodeIds = new Set(map.nodes.map(node => node.id));
  return {
    ...map,
    selectableNodeIds: selectableNodeIds.filter(nodeId => validNodeIds.has(nodeId)),
  };
}

export function createGameRoute({ level, lives, maxLives, hasRepairTargets }: CreateGameRouteArgs): GameRunRouteState {
  const lowHpThreshold = Math.max(10, Math.round(maxLives * 0.35));
  const topKind: GameRouteNodeKind = (lives < lowHpThreshold || hasRepairTargets) ? 'rest' : 'treasure';
  const bottomKind: GameRouteNodeKind = level % 4 === 0 ? 'shop' : 'risk';
  const previewPools: GameRouteNodeKind[][] = [
    [topKind, 'battle', bottomKind],
    [level % 3 === 0 ? 'shop' : 'treasure', 'battle', level % 2 === 0 ? 'risk' : 'rest'],
    [level % 4 === 0 ? 'treasure' : 'rest', 'battle', level % 3 === 0 ? 'shop' : 'risk'],
  ];
  const choices = previewPools.flatMap((columnKinds, column) =>
    columnKinds.map((kind, lane) => buildRouteNode(kind, lane, column)),
  );

  return {
    id: createRouteId(level),
    sourceLevel: level,
    choices,
    links: buildRouteLinks(choices),
    selectableChoiceIds: choices.filter(choice => choice.column === 0).map(choice => choice.id),
    resolvedChoiceId: null,
    resultText: null,
  };
}
