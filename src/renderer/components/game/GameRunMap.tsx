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
import { getMapKindLabel } from '../../../core/game/routes';

type GameRunMapProps = {
  map: GameRunMapState;
  onSelectNode: (nodeId: string) => void;
};

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
  const columnWidth = 148;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [graphSize, setGraphSize] = useState({ width: 1, height: 1 });
  const [lineCoords, setLineCoords] = useState<Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    active: boolean;
  }>>([]);
  const columns = useMemo(
    () => Array.from(new Set(map.nodes.map(node => node.column))).sort((a, b) => a - b),
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
    const graph = graphRef.current;
    if (!graph) return;

    const measure = () => {
      const graphRect = graph.getBoundingClientRect();
      setGraphSize({
        width: Math.max(1, graph.scrollWidth),
        height: Math.max(1, graph.scrollHeight),
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
    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(graph);
    Object.values(nodeRefs.current).forEach(node => {
      if (node) resizeObserver.observe(node);
    });
    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [map.links, map.selectableNodeIds, map.visitedNodeIds, map.nodes]);

  return (
    <div className="game-map-shell">
      <div className="game-map-title-row">
        <div>
          <div className="game-map-title">Карта забега</div>
          <div className="game-map-subtitle">
            Выбирай следующую точку на графе. Бои и комнаты открываются поверх карты, а путь остается перед глазами.
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="game-map-scroll">
        <div ref={graphRef} className="game-map-graph" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(${columnWidth}px, ${columnWidth}px))` }}>
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

          {columns.map(column => {
            const nodes = map.nodes.filter(node => node.column === column).sort((a, b) => a.lane - b.lane);
            return (
              <div key={`map-column-${column}`} className="game-map-column">
                {nodes.map(node => {
                  const Icon = getMapNodeIcon(node.kind);
                  const selectable = selectableNodeIds.has(node.id);
                  const current = currentNode?.id === node.id;
                  const visited = visitedNodeIds.has(node.id);

                  return (
                    <button
                      key={node.id}
                      ref={element => { nodeRefs.current[node.id] = element; }}
                      className={`game-map-node kind-${node.kind}${selectable ? ' selectable' : ''}${current ? ' current' : ''}${visited ? ' visited' : ''}`}
                      style={{ gridRow: `${node.lane + 1}` }}
                      disabled={!selectable}
                      onClick={() => onSelectNode(node.id)}
                      title={`${node.title} — ${node.description}`}
                    >
                      <span className="game-map-node-icon">
                        <Icon size={18} />
                      </span>
                      <span className="game-map-node-copy">
                        <span className="game-map-node-kind">{getMapKindLabel(node.kind)}</span>
                        <span className="game-map-node-title">{node.title}</span>
                        <span className="game-map-node-flavor">{node.flavor}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="game-map-legend">
        <span><Swords size={14} /> Бой</span>
        <span><Crown size={14} /> Босс</span>
        <span><Heart size={14} /> Передышка</span>
        <span><Gift size={14} /> Тайник</span>
        <span><ShoppingBag size={14} /> Лавка</span>
        <span><TriangleAlert size={14} /> Риск</span>
        <span><Flame size={14} /> Элита</span>
        <span><Skull size={14} /> Мини-босс</span>
      </div>
    </div>
  );
});
