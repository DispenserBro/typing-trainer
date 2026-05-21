import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Crown,
  Gift,
  Heart,
  ShoppingBag,
  Swords,
  TriangleAlert,
  Flame,
  Skull,
} from 'lucide-react';
import type { GameRunMapNode, GameRunMapState } from '../../../shared/types';
import { buildGameRunMapLayoutViewModel } from '../../../core/game/routes';
import { useI18n } from '../../contexts/I18nContext';
import { getGameMapKindLabel } from './gameText';

type GameRunMapProps = {
  map: GameRunMapState;
  onSelectNode: (nodeId: string) => void;
};

const MAP_MIN_GRAPH_HEIGHT = 420;

function getMapNodeIcon(kind: GameRunMapNode['kind']) {
  if (kind === 'boss') return Crown;
  if (kind === 'rest') return Heart;
  if (kind === 'treasure') return Gift;
  if (kind === 'shop') return ShoppingBag;
  if (kind === 'risk') return TriangleAlert;
  if (kind === 'elite') return Flame;
  if (kind === 'miniboss') return Skull;
  return Swords;
}

export const GameRunMap = memo(function GameRunMap({ map, onSelectNode }: GameRunMapProps) {
  const { t } = useI18n();
  const columnWidth = 164;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const titleRowRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [graphSize, setGraphSize] = useState({ width: 1, height: 1 });
  const [graphHeight, setGraphHeight] = useState(MAP_MIN_GRAPH_HEIGHT);
  const [lineCoords, setLineCoords] = useState<Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    active: boolean;
  }>>([]);
  const mapLayout = useMemo(
    () => buildGameRunMapLayoutViewModel(map),
    [map.nodes],
  );
  const selectableNodeIds = new Set(map.selectableNodeIds);
  const visitedNodeIds = new Set(map.visitedNodeIds);
  const currentNode = map.nodes.find(node => node.id === map.currentNodeId) ?? null;

  useEffect(() => {
    const targetId = map.selectableNodeIds[0] ?? map.currentNodeId;
    if (!targetId) return;
    const targetNode = nodeRefs.current[targetId];
    targetNode?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [map.currentNodeId, map.selectableNodeIds]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const scroll = scrollRef.current;
    const titleRow = titleRowRef.current;
    const graph = graphRef.current;
    const legend = legendRef.current;
    if (!shell || !scroll || !titleRow || !graph || !legend) return;

    const measure = () => {
      const scrollStyles = window.getComputedStyle(scroll);
      const paddingTop = parseFloat(scrollStyles.paddingTop) || 0;
      const paddingBottom = parseFloat(scrollStyles.paddingBottom) || 0;
      const availableHeight = scroll.clientHeight - paddingTop - paddingBottom;
      const nextGraphHeight = Math.max(MAP_MIN_GRAPH_HEIGHT, availableHeight);
      setGraphHeight(prev => (prev === nextGraphHeight ? prev : nextGraphHeight));

      const graphRect = graph.getBoundingClientRect();
      setGraphSize({
        width: Math.max(1, graph.scrollWidth),
        height: Math.max(1, nextGraphHeight),
      });
      const selectableNodeIds = new Set(map.selectableNodeIds);
      const visitedNodeIds = new Set(map.visitedNodeIds);
      const nextCoords = map.links.flatMap(link => {
        const fromNode = nodeRefs.current[link.fromId];
        const toNode = nodeRefs.current[link.toId];
        if (!fromNode || !toNode) return [];

        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const active = visitedNodeIds.has(link.fromId) && (visitedNodeIds.has(link.toId) || selectableNodeIds.has(link.toId));

        return [{
          key: `${link.fromId}-${link.toId}`,
          x1: fromRect.right - graphRect.left,
          y1: fromRect.top - graphRect.top + fromRect.height / 2,
          x2: toRect.left - graphRect.left,
          y2: toRect.top - graphRect.top + toRect.height / 2,
          active,
        }];
      });
      setLineCoords(nextCoords);
    };

    measure();
    const rafPrimary = requestAnimationFrame(() => measure());
    const rafSecondary = requestAnimationFrame(() => {
      requestAnimationFrame(() => measure());
    });
    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(shell);
    resizeObserver.observe(titleRow);
    resizeObserver.observe(graph);
    resizeObserver.observe(legend);
    Object.values(nodeRefs.current).forEach(node => {
      if (node) resizeObserver.observe(node);
    });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafPrimary);
      cancelAnimationFrame(rafSecondary);
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [map.links, map.selectableNodeIds, map.visitedNodeIds, map.nodes]);

  return (
    <div ref={shellRef} className="game-map-shell">
      <div ref={titleRowRef} className="game-map-title-row">
        <div>
          <div className="game-map-title">{t('game.map.title')}</div>
          <div className="game-map-subtitle">
            {t('game.map.subtitle')}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="game-map-scroll">
        <div
          ref={graphRef}
            className="game-map-graph"
            style={{
            gridTemplateColumns: `repeat(${mapLayout.columnCount}, minmax(${columnWidth}px, ${columnWidth}px))`,
            height: `${graphHeight}px`,
            minHeight: `${graphHeight}px`,
          }}
        >
          <svg
            className="game-map-lines"
            width={graphSize.width}
            height={graphSize.height}
            viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
            aria-hidden="true"
          >
            {lineCoords.map(line => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                className={line.active ? 'active' : undefined}
              />
            ))}
          </svg>

          {mapLayout.columns.map(column => {
            return (
              <div key={`map-column-${column.column}`} className="game-map-column">
                {column.slots.map(slot => {
                  const { lane, node } = slot;
                  if (!node) {
                    return <div key={`map-slot-${column.column}-${lane}`} className="game-map-slot" />;
                  }

                  const Icon = getMapNodeIcon(node.kind);
                  const selectable = selectableNodeIds.has(node.id);
                  const current = currentNode?.id === node.id;
                  const visited = visitedNodeIds.has(node.id);

                  return (
                    <div key={node.id} className="game-map-slot">
                      <button
                        ref={element => { nodeRefs.current[node.id] = element; }}
                        className={`game-map-node kind-${node.kind}${selectable ? ' selectable' : ''}${current ? ' current' : ''}${visited ? ' visited' : ''}`}
                        disabled={!selectable}
                        onClick={() => onSelectNode(node.id)}
                        title={`${node.title} — ${node.description}`}
                      >
                        <span className="game-map-node-icon">
                          <Icon size={18} />
                        </span>
                        <span className="game-map-node-copy">
                          <span className="game-map-node-kind">{getGameMapKindLabel(node.kind, t)}</span>
                          <span className="game-map-node-title">{node.title}</span>
                          <span className="game-map-node-flavor">{node.flavor}</span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={legendRef} className="game-map-legend">
        <span><Swords size={14} /> {t('game.map.legend.battle')}</span>
        <span><Crown size={14} /> {t('game.map.legend.boss')}</span>
        <span><Heart size={14} /> {t('game.map.legend.rest')}</span>
        <span><Gift size={14} /> {t('game.map.legend.treasure')}</span>
        <span><ShoppingBag size={14} /> {t('game.map.legend.shop')}</span>
        <span><TriangleAlert size={14} /> {t('game.map.legend.risk')}</span>
        <span><Flame size={14} /> {t('game.map.legend.elite')}</span>
        <span><Skull size={14} /> {t('game.map.legend.miniboss')}</span>
      </div>
    </div>
  );
});
