import type {
  GameInventoryItem,
  GameRunMapNode,
  GameRunMapState,
  GameRunEventChoice,
  GameRunEventState,
  GameRunRouteLink,
  GameRunModifier,
  GameRunRouteChoice,
  GameRunRouteState,
  GameState,
  Progress,
} from '../../shared/types';
import { GAME_ACHIEVEMENT_MAP } from '../../core/game/gameAchievements';
import { GAME_ITEM_MAP, isBrokenInventoryItem } from '../../core/game/items';
import { PLAYER_BASE_HP } from '../../core/game/battleSystem';
import { defaultGameState } from './appDefaults';

export function normalizeGameRunModifier(modifier?: Partial<GameRunModifier> | null): GameRunModifier | null {
  if (!modifier?.id || !modifier?.name) return null;
  return {
    id: modifier.id,
    name: modifier.name,
    description: typeof modifier.description === 'string' ? modifier.description : '',
    speedRequirementReductionPercent: Math.max(0, Number(modifier.speedRequirementReductionPercent ?? 0)) || undefined,
    accuracyRequirementReduction: Math.max(0, Number(modifier.accuracyRequirementReduction ?? 0)) || undefined,
    bossTimerBonusSeconds: Math.max(0, Number(modifier.bossTimerBonusSeconds ?? 0)) || undefined,
    bossOnly: Boolean(modifier.bossOnly),
    remainingLevels: Math.max(0, Math.floor(Number(modifier.remainingLevels ?? 0))),
  };
}

export function normalizeGameRunEventChoice(choice?: Partial<GameRunEventChoice> | null): GameRunEventChoice | null {
  if (!choice?.id || !choice?.title) return null;
  return {
    id: choice.id,
    title: choice.title,
    flavor: typeof choice.flavor === 'string' ? choice.flavor : '',
    description: typeof choice.description === 'string' ? choice.description : '',
    effect: {
      lifeDelta: typeof choice.effect?.lifeDelta === 'number' ? Math.round(choice.effect.lifeDelta) : undefined,
      repairEquippedBy: typeof choice.effect?.repairEquippedBy === 'number' ? Math.max(0, Math.round(choice.effect.repairEquippedBy)) : undefined,
      grantItemId: typeof choice.effect?.grantItemId === 'string' ? choice.effect.grantItemId : undefined,
      modifier: normalizeGameRunModifier(choice.effect?.modifier) ?? undefined,
    },
    disabled: Boolean(choice.disabled),
  };
}

export function normalizeGameRunEventState(event?: Partial<GameRunEventState> | null): GameRunEventState | null {
  if (!event?.id || !event?.title || !event?.kind) return null;
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    description: typeof event.description === 'string' ? event.description : '',
    sourceLevel: Math.max(1, Math.floor(Number(event.sourceLevel ?? 1))),
    choices: Array.isArray(event.choices)
      ? event.choices
        .map(choice => normalizeGameRunEventChoice(choice))
        .filter((choice): choice is GameRunEventChoice => Boolean(choice))
      : [],
    resolvedChoiceId: typeof event.resolvedChoiceId === 'string' ? event.resolvedChoiceId : null,
    resultText: typeof event.resultText === 'string' ? event.resultText : null,
  };
}

export function normalizeGameRunRouteChoice(choice?: Partial<GameRunRouteChoice> | null): GameRunRouteChoice | null {
  if (!choice?.id || !choice?.title || !choice?.kind) return null;
  return {
    id: choice.id,
    kind: choice.kind,
    title: choice.title,
    flavor: typeof choice.flavor === 'string' ? choice.flavor : '',
    description: typeof choice.description === 'string' ? choice.description : '',
    lane: typeof choice.lane === 'number' ? Math.max(0, Math.min(2, Math.floor(choice.lane))) : 1,
    column: typeof choice.column === 'number' ? Math.max(0, Math.min(3, Math.floor(choice.column))) : 0,
    disabled: Boolean(choice.disabled),
  };
}

function normalizeGameRunRouteLink(link?: Partial<GameRunRouteLink> | null): GameRunRouteLink | null {
  if (!link?.fromId || !link?.toId) return null;
  return {
    fromId: link.fromId,
    toId: link.toId,
  };
}

function normalizeGameRunMapNode(node?: Partial<GameRunMapNode> | null): GameRunMapNode | null {
  if (!node?.id || !node.kind) return null;
  return {
    id: node.id,
    kind: node.kind,
    title: typeof node.title === 'string' ? node.title : '',
    flavor: typeof node.flavor === 'string' ? node.flavor : '',
    description: typeof node.description === 'string' ? node.description : '',
    column: typeof node.column === 'number' ? Math.max(0, Math.floor(node.column)) : 0,
    lane: typeof node.lane === 'number' ? Math.max(0, Math.min(2, Math.floor(node.lane))) : 1,
    battleLevel: typeof node.battleLevel === 'number' ? Math.max(1, Math.floor(node.battleLevel)) : null,
  };
}

function normalizeGameRunMapState(map?: Partial<GameRunMapState> | null): GameRunMapState | null {
  if (!map) return null;
  const nodes = Array.isArray(map.nodes)
    ? map.nodes
      .map(node => normalizeGameRunMapNode(node))
      .filter((node): node is GameRunMapNode => Boolean(node))
    : [];
  const links = Array.isArray(map.links)
    ? map.links
      .map(link => normalizeGameRunRouteLink(link))
      .filter((link): link is GameRunRouteLink => Boolean(link))
    : [];
  const nodeIds = new Set(nodes.map(node => node.id));
  return {
    nodes,
    links: links.filter(link => nodeIds.has(link.fromId) && nodeIds.has(link.toId)),
    currentNodeId: typeof map.currentNodeId === 'string' && nodeIds.has(map.currentNodeId)
      ? map.currentNodeId
      : (nodes[0]?.id ?? null),
    visitedNodeIds: Array.isArray(map.visitedNodeIds)
      ? Array.from(new Set(map.visitedNodeIds.filter(nodeId => nodeIds.has(nodeId))))
      : [],
    selectableNodeIds: Array.isArray(map.selectableNodeIds)
      ? Array.from(new Set(map.selectableNodeIds.filter(nodeId => nodeIds.has(nodeId))))
      : [],
  };
}

export function normalizeGameRunRouteState(route?: Partial<GameRunRouteState> | null): GameRunRouteState | null {
  if (!route?.id) return null;
  const choices = Array.isArray(route.choices)
    ? route.choices
      .map(choice => normalizeGameRunRouteChoice(choice))
      .filter((choice): choice is GameRunRouteChoice => Boolean(choice))
    : [];
  return {
    id: route.id,
    sourceLevel: Math.max(1, Math.floor(Number(route.sourceLevel ?? 1))),
    choices,
    links: Array.isArray(route.links)
      ? route.links
        .map(link => normalizeGameRunRouteLink(link))
        .filter((link): link is GameRunRouteLink => Boolean(link))
      : [],
    selectableChoiceIds: Array.isArray(route.selectableChoiceIds)
      ? route.selectableChoiceIds.filter(choiceId => choices.some(choice => choice.id === choiceId))
      : choices.filter(choice => choice.column === 0).map(choice => choice.id),
    resolvedChoiceId: typeof route.resolvedChoiceId === 'string' ? route.resolvedChoiceId : null,
    resultText: typeof route.resultText === 'string' ? route.resultText : null,
  };
}

function createLegacyInventoryItemId(itemId: string, entryIndex: number, duplicateIndex = 0) {
  return `legacy-${itemId}-${entryIndex}-${duplicateIndex}`;
}

function normalizeInventoryItem(entry: unknown, entryIndex: number): GameInventoryItem[] {
  if (!entry || typeof entry !== 'object') return [];
  const candidate = entry as Partial<GameInventoryItem> & { itemId?: string; count?: number };
  if (!candidate.itemId || !GAME_ITEM_MAP[candidate.itemId]) return [];

  const item = GAME_ITEM_MAP[candidate.itemId];
  const maxDurability = item.maxDurability ?? null;

  if (typeof candidate.id === 'string') {
    const savedMaxDurability = typeof candidate.maxDurability === 'number'
      ? Math.max(0, Math.floor(candidate.maxDurability))
      : maxDurability;
    const savedDurability = typeof candidate.durability === 'number'
      ? Math.max(0, Math.min(Math.floor(candidate.durability), savedMaxDurability ?? Number.MAX_SAFE_INTEGER))
      : savedMaxDurability;

    return [{
      id: candidate.id,
      itemId: candidate.itemId,
      durability: savedMaxDurability == null ? null : savedDurability,
      maxDurability: savedMaxDurability,
    }];
  }

  const count = typeof candidate.count === 'number' ? Math.max(1, Math.floor(candidate.count)) : 1;
  return Array.from({ length: count }, (_, duplicateIndex) => ({
    id: createLegacyInventoryItemId(candidate.itemId!, entryIndex, duplicateIndex),
    itemId: candidate.itemId!,
    durability: maxDurability,
    maxDurability,
  }));
}

export function resolveGameState(progress: Progress): GameState {
  const base = defaultGameState(progress.game);
  const inventory = base.inventory
    .flatMap((entry, entryIndex) => normalizeInventoryItem(entry, entryIndex))
    .filter(entry => GAME_ITEM_MAP[entry.itemId]);

  const discoveredItemIds = Array.from(new Set([
    ...base.discoveredItemIds.filter(itemId => GAME_ITEM_MAP[itemId]),
    ...inventory.map(entry => entry.itemId),
  ]));
  const achievements = Array.from(new Set(
    (base.achievements ?? []).filter(achievementId => GAME_ACHIEVEMENT_MAP[achievementId]),
  ));

  const usedInventoryIds = new Set<string>();
  const normalizeEquippedSlot = (value: string | null | undefined) => {
    if (!value) return null;

    const exactItem = inventory.find(entry => entry.id === value && !isBrokenInventoryItem(entry) && !usedInventoryIds.has(entry.id));
    if (exactItem) {
      usedInventoryIds.add(exactItem.id);
      return exactItem.id;
    }

    return null;
  };

  return {
    highestLevel: Math.max(1, Math.floor(base.highestLevel || 1)),
    inventory,
    discoveredItemIds,
    achievements,
    equipped: {
      slotA: normalizeEquippedSlot(base.equipped.slotA),
      slotB: normalizeEquippedSlot(base.equipped.slotB),
      slotC: normalizeEquippedSlot(base.equipped.slotC),
    },
    currentRun: base.currentRun ? {
      level: Math.max(1, Math.floor(base.currentRun.level || 1)),
      lives: Math.max(0, Math.floor(base.currentRun.lives || 0)),
      maxLives: Math.max(1, Math.floor((base.currentRun as any).maxLives || PLAYER_BASE_HP)),
      regenTurns: Math.max(0, Math.floor((base.currentRun as any).regenTurns || 0)),
      completedLevels: Math.max(0, Math.floor(base.currentRun.completedLevels || 0)),
      targetSpeedCpm: Math.max(1, Math.floor(base.currentRun.targetSpeedCpm || 1)),
      levelText: typeof base.currentRun.levelText === 'string' ? base.currentRun.levelText : '',
      activeModifiers: Array.isArray(base.currentRun.activeModifiers)
        ? base.currentRun.activeModifiers
          .map(modifier => normalizeGameRunModifier(modifier))
          .filter((modifier): modifier is GameRunModifier => Boolean(modifier && modifier.remainingLevels > 0))
        : [],
      map: normalizeGameRunMapState(base.currentRun.map),
      pendingRoute: normalizeGameRunRouteState(base.currentRun.pendingRoute),
      pendingEvent: normalizeGameRunEventState(base.currentRun.pendingEvent),
      result: base.currentRun.result ?? null,
      rewardChoices: base.currentRun.rewardChoices ?? null,
      selectedRewardMessage: base.currentRun.selectedRewardMessage ?? null,
      battleState: (base.currentRun as any).battleState ?? null,
      dailySeed: typeof base.currentRun.dailySeed === 'string' ? base.currentRun.dailySeed : null,
    } : null,
    ghostRun: base.ghostRun ? {
      date: typeof base.ghostRun.date === 'string' ? base.ghostRun.date : new Date().toISOString(),
      maxLevel: Math.max(0, Math.floor(base.ghostRun.maxLevel || 0)),
      levels: Array.isArray(base.ghostRun.levels) ? base.ghostRun.levels.map(l => ({
        level: Math.max(1, Math.floor(l.level || 1)),
        wpm: Math.max(0, l.wpm || 0),
        acc: Math.max(0, Math.min(100, l.acc || 0)),
        elapsed: Math.max(0, l.elapsed || 0),
        passed: Boolean(l.passed),
      })) : [],
    } : null,
    dailyRun: base.dailyRun ? {
      history: typeof base.dailyRun.history === 'object' && base.dailyRun.history
        ? Object.fromEntries(
          Object.entries(base.dailyRun.history)
            .filter(([key, val]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && val && typeof val === 'object')
            .map(([key, val]) => [key, {
              date: val.date ?? key,
              maxLevel: Math.max(0, Math.floor(val.maxLevel || 0)),
              completedLevels: Math.max(0, Math.floor(val.completedLevels || 0)),
              bestWpm: Math.max(0, val.bestWpm || 0),
              avgAcc: Math.max(0, Math.min(100, val.avgAcc || 0)),
              totalTime: Math.max(0, val.totalTime || 0),
              attempts: Math.max(0, Math.floor(val.attempts || 0)),
            }]),
        )
        : {},
    } : null,
  };
}

