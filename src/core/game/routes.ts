import type {
  GameRunMapNode,
  GameRunMapState,
  GameRouteNodeKind,
  GameRunRouteLink,
  GameRunRouteChoice,
  GameRunRouteState,
} from '../../shared/types';
import { BOSS_LEVEL_INTERVAL, isBossLevel } from './runUtils';

type CreateGameRouteArgs = {
  level: number;
  lives: number;
  hasRepairTargets: boolean;
};

function createRouteId(level: number) {
  return `route-${level}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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
  if (kind === 'battle') return 'Прямая тропа';
  if (kind === 'rest') return 'Передышка';
  if (kind === 'treasure') return 'Тайник';
  if (kind === 'shop') return 'Лавка';
  return 'Риск';
}

export function getMapKindLabel(kind: GameRunMapNode['kind']) {
  if (kind === 'boss') return 'Босс';
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
      'Прямая тропа',
      'Без остановок идти к следующему уровню',
      'Чистый боевой путь: без комнат подготовки, но и без задержки перед новой волной.',
      lane,
      column,
    );
  }
  if (kind === 'rest') {
    return createChoice(
      id,
      kind,
      'Передышка у костра',
      'Подлечиться и перевести дыхание',
      'Комната отдыха: ремонт, восстановление жизни и мягкие темповые бафы.',
      lane,
      column,
    );
  }
  if (kind === 'treasure') {
    return createChoice(
      id,
      kind,
      'Тайник на обочине',
      'Забрать припасы и реликвии',
      'Комната трофеев: шанс забрать бесплатный предмет или запас под следующую волну.',
      lane,
      column,
    );
  }
  if (kind === 'shop') {
    return createChoice(
      id,
      kind,
      'Лавка сборщика',
      'Подготовиться в безопасной комнате',
      'Комната торговли: ремонт, новая реликвия или короткое усиление перед следующим боем.',
      lane,
      column,
    );
  }
  return createChoice(
    id,
    kind,
    'Сделка на грани',
    'Пойти в риск ради сильного буста',
    'Рискованная комната: сильные бонусы, но каждое предложение требует плату заранее.',
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
    current.forEach(fromNode => {
      next
        .filter(toNode => Math.abs(toNode.lane - fromNode.lane) <= 1)
        .forEach(toNode => {
          links.push({ fromId: fromNode.id, toId: toNode.id });
        });
    });
  }

  return links;
}

function clampLane(lane: number) {
  return Math.max(0, Math.min(2, lane));
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function getRandomRoomKind(level: number, lane: number): GameRouteNodeKind {
  const weightedKinds: GameRouteNodeKind[] = [
    lane === 1 ? 'battle' : 'treasure',
    level % 4 === 0 ? 'shop' : 'treasure',
    level % 3 === 0 ? 'risk' : 'rest',
    'battle',
  ];
  return randomFrom(weightedKinds);
}

function shouldCreateRoomColumn(level: number) {
  return level % 5 !== 0 && level % 2 === 0;
}

function getRoomBranchCount(level: number) {
  if (level % 6 === 0) return 3;
  if (level % 4 === 0) return 2;
  return 1;
}

function getBranchDepth(level: number) {
  if (level % 5 === 4) return randomFrom([0, 1, 1, 2]);
  if (level % 3 === 0) return randomFrom([1, 2, 2, 3]);
  return randomFrom([0, 1, 1, 2, 3]);
}

function getBridgeLane(fromLane: number, toLane: number, step: number, depth: number) {
  const progress = (step + 1) / (depth + 1);
  return clampLane(Math.round(fromLane + (toLane - fromLane) * progress));
}

function buildBranchColumnLanes(
  fromLane: number,
  toLane: number,
  step: number,
  depth: number,
) {
  const bridgeLane = getBridgeLane(fromLane, toLane, step, depth);
  const desiredCount = step === depth - 1
    ? randomFrom([1, 2, 2, 3])
    : randomFrom([2, 2, 3]);
  const laneSet = new Set<number>([bridgeLane]);
  const candidates = [fromLane, toLane, clampLane(bridgeLane - 1), clampLane(bridgeLane + 1), 1];

  for (const lane of candidates) {
    if (laneSet.size >= desiredCount) break;
    laneSet.add(clampLane(lane));
  }

  while (laneSet.size < desiredCount) {
    laneSet.add(randomFrom([0, 1, 2]));
  }

  return Array.from(laneSet).sort((a, b) => a - b);
}

function getMapRoomKinds(level: number, battleLane: number, nextBattleLane: number): Array<{ kind: GameRouteNodeKind; lane: number }> {
  const desiredCount = getRoomBranchCount(level);
  const preferredLanes = Array.from(new Set([
    battleLane,
    nextBattleLane,
    clampLane(battleLane + (Math.random() > 0.5 ? 1 : -1)),
    clampLane(nextBattleLane + (Math.random() > 0.5 ? 1 : -1)),
    1,
  ]));

  const lanes = preferredLanes.slice(0, desiredCount).sort((a, b) => a - b);
  return lanes.map(lane => ({
    lane,
    kind: getRandomRoomKind(level, lane),
  }));
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
      title: 'Вратарь ветви',
      flavor: 'Главная проверка этого маршрута',
      description: `Каждый ${BOSS_LEVEL_INTERVAL}-й уровень — это бой с таймером и повышенным требованием к точности.`,
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'battle' && battleLevel != null) {
    return {
      id,
      kind,
      title: 'Схватка',
      flavor: 'Обычный бой на скорость и точность',
      description: 'Стандартная волна текста. Удерживай темп и проходи дальше по карте.',
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'battle') {
    return {
      id,
      kind,
      title: 'Прямая тропа',
      flavor: 'Сразу перейти к следующему бою',
      description: 'Короткий путь без остановок и комнат подготовки.',
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'rest') {
    return {
      id,
      kind,
      title: 'Передышка у костра',
      flavor: 'Подлечиться и перевести дух',
      description: 'Комната отдыха: ремонт, восстановление жизни и спокойный темп перед следующим боем.',
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'treasure') {
    return {
      id,
      kind,
      title: 'Тайник на обочине',
      flavor: 'Забрать реликвии и припасы',
      description: 'Комната добычи: бесплатный предмет или полезный запас под следующий бой.',
      column,
      lane,
      battleLevel,
    };
  }

  if (kind === 'shop') {
    return {
      id,
      kind,
      title: 'Лавка сборщика',
      flavor: 'Ремонт и подготовка',
      description: 'Комната торговли: ремонт, новая реликвия или короткий боевой буст.',
      column,
      lane,
      battleLevel,
    };
  }

  return {
    id,
    kind,
    title: 'Сделка на грани',
    flavor: 'Риск ради сильного буста',
    description: 'Опасная комната: мощные бонусы, но за них придется платить заранее.',
    column,
    lane,
    battleLevel,
  };
}

export function createGameRunMap(totalLevels: number): GameRunMapState {
  const nodes: GameRunMapNode[] = [];
  const links: GameRunRouteLink[] = [];
  let currentBattleLane = 1;
  let currentColumn = 0;

  for (let level = 1; level <= totalLevels; level += 1) {
    const battleColumn = currentColumn;
    const battleId = `battle-${level}`;
    nodes.push(createMapNode(battleId, isBossLevel(level) ? 'boss' : 'battle', battleColumn, currentBattleLane, level));
    currentColumn += 1;

    if (level >= totalLevels) continue;

    const nextBattleId = `battle-${level + 1}`;
    if (isBossLevel(level)) {
      links.push({ fromId: battleId, toId: nextBattleId });
      currentBattleLane = 1;
      continue;
    }

    const nextBattleLane = clampLane(currentBattleLane + randomFrom([-1, 0, 1]));

    const branchDepth = shouldCreateRoomColumn(level) ? getBranchDepth(level) : 0;
    if (branchDepth <= 0) {
      links.push({ fromId: battleId, toId: nextBattleId });
      currentBattleLane = nextBattleLane;
      continue;
    }

    let frontier = [{ id: battleId, lane: currentBattleLane }];

    for (let step = 0; step < branchDepth; step += 1) {
      const roomColumn = currentColumn;
      const lanes = buildBranchColumnLanes(currentBattleLane, nextBattleLane, step, branchDepth);
      const roomNodes = lanes.map(lane => {
        const roomKind = getRandomRoomKind(level + step, lane);
        const roomId = `room-${level}-${step}-${lane}-${roomKind}`;
        const node = createMapNode(roomId, roomKind, roomColumn, lane);
        nodes.push(node);
        return { id: roomId, lane };
      });

      frontier.forEach(fromNode => {
        let connected = false;
        roomNodes.forEach(toNode => {
          if (Math.abs(toNode.lane - fromNode.lane) <= 1) {
            links.push({ fromId: fromNode.id, toId: toNode.id });
            connected = true;
          }
        });
        if (!connected) {
          const fallbackNode = roomNodes.reduce((best, candidate) => (
            Math.abs(candidate.lane - fromNode.lane) < Math.abs(best.lane - fromNode.lane) ? candidate : best
          ), roomNodes[0]);
          links.push({ fromId: fromNode.id, toId: fallbackNode.id });
        }
      });

      frontier = roomNodes;
      currentColumn += 1;
    }

    frontier.forEach(fromNode => {
      if (Math.abs(fromNode.lane - nextBattleLane) <= 1) {
        links.push({ fromId: fromNode.id, toId: nextBattleId });
      }
    });

    if (!links.some(link => link.toId === nextBattleId && frontier.some(node => node.id === link.fromId))) {
      const fallbackNode = frontier.reduce((best, candidate) => (
        Math.abs(candidate.lane - nextBattleLane) < Math.abs(best.lane - nextBattleLane) ? candidate : best
      ), frontier[0]);
      links.push({ fromId: fallbackNode.id, toId: nextBattleId });
    }

    currentBattleLane = nextBattleLane;
  }

  return {
    nodes,
    links,
    currentNodeId: 'battle-1',
    visitedNodeIds: ['battle-1'],
    selectableNodeIds: [],
  };
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

export function createGameRoute({ level, lives, hasRepairTargets }: CreateGameRouteArgs): GameRunRouteState {
  const topKind: GameRouteNodeKind = (lives < 3 || hasRepairTargets) ? 'rest' : 'treasure';
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
