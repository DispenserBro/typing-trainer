import type {
  GameRunEventChoice,
  GameRunEventState,
  GameRunMapNode,
  GameRunMapState,
  GameRunModifier,
  GameRunRouteChoice,
  GameRunRouteLink,
  GameRunRouteState,
} from '../../shared/types';

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
    lane: typeof node.lane === 'number' ? Math.max(0, Math.min(4, Math.floor(node.lane))) : 1,
    battleLevel: typeof node.battleLevel === 'number' ? Math.max(1, Math.floor(node.battleLevel)) : null,
  };
}

export function normalizeGameRunMapState(map?: Partial<GameRunMapState> | null): GameRunMapState | null {
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
