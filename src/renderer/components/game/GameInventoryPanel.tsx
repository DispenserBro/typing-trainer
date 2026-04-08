import { memo, useMemo, useState } from 'react';
import type {
  DragEvent as ReactDragEvent,
  ComponentType,
} from 'react';
import type {
  GameEquipmentSlot,
} from '../../../shared/types';
import {
  GAME_EQUIPMENT_SLOTS,
  getGameItemIcon,
  getGameItemRarityStars,
} from '../../../core/game/items';
import { formatGameItemMeta } from '../../../core/game/runUtils';
import type { EquippedEntry, InventoryEntry } from '../../../core/game/viewTypes';

type DragPayload = {
  itemId: string;
  fromSlot: GameEquipmentSlot | null;
};

type GameInventoryPanelProps = {
  inventoryItems: InventoryEntry[];
  equippedItems: EquippedEntry[];
  onEquip: (slot: GameEquipmentSlot, itemId: string) => void;
  onUnequip: (slot: GameEquipmentSlot) => void;
};

export const GameInventoryPanel = memo(function GameInventoryPanel({
  inventoryItems,
  equippedItems,
  onEquip,
  onUnequip,
}: GameInventoryPanelProps) {
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<GameEquipmentSlot | null>(null);
  const [inventoryDropActive, setInventoryDropActive] = useState(false);

  const equippedBySlot = useMemo(
    () => Object.fromEntries(equippedItems.map(entry => [entry.slot.key, entry])) as Record<GameEquipmentSlot, EquippedEntry>,
    [equippedItems],
  );
  const visibleInventoryItems = useMemo(
    () => inventoryItems.filter(item => !item.equippedIn),
    [inventoryItems],
  );

  const startDrag = (event: ReactDragEvent<HTMLElement>, itemId: string, fromSlot: GameEquipmentSlot | null) => {
    setDragPayload({ itemId, fromSlot });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  };

  const endDrag = () => {
    setDragPayload(null);
    setHoveredSlot(null);
    setInventoryDropActive(false);
  };

  const allowDrop = (event: ReactDragEvent<HTMLElement>) => {
    if (!dragPayload) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const moveToSlot = (slot: GameEquipmentSlot) => {
    if (!dragPayload) return;
    if (dragPayload.fromSlot === slot) return;
    onEquip(slot, dragPayload.itemId);
  };

  const moveBackToInventory = () => {
    if (!dragPayload?.fromSlot) return;
    onUnequip(dragPayload.fromSlot);
  };

  return (
    <>
      <details className={`card game-items-card${inventoryDropActive ? ' drag-target' : ''}`} open>
        <summary className="game-items-summary">
          <span>Инвентарь</span>
          <small>{visibleInventoryItems.length} предметов</small>
        </summary>
        <p className="card-desc">
          Реликвии добываются только после побед над боссами. Перетащи предмет в слот, чтобы экипировать его, и обратно в инвентарь, чтобы снять.
        </p>
        <div
          className={`game-inventory-dropzone${inventoryDropActive ? ' drop-active' : ''}`}
          onDragOver={(event) => {
            if (!dragPayload?.fromSlot) return;
            allowDrop(event);
            setInventoryDropActive(true);
          }}
          onDragLeave={() => setInventoryDropActive(false)}
          onDrop={(event) => {
            if (!dragPayload?.fromSlot) return;
            event.preventDefault();
            moveBackToInventory();
            endDrag();
          }}
        >
          {visibleInventoryItems.length ? (
            <div className="game-inventory-grid">
              {visibleInventoryItems.map(item => {
              const Icon = getGameItemIcon(item.meta.icon);

              return (
                <div
                  key={item.id}
                  draggable={!item.broken}
                  onDragStart={(event) => startDrag(event, item.id, null)}
                  onDragEnd={endDrag}
                  className={`game-inventory-card rarity-${item.meta.rarity}${item.broken ? ' broken' : ''}${dragPayload?.itemId === item.id ? ' dragging' : ''}`}
                >
                  <div className="game-inventory-head">
                    <div className="game-item-badge">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="game-slot-name">{item.meta.name}</div>
                      <div className="game-item-meta">{formatGameItemMeta(item.meta, false)}</div>
                    </div>
                  </div>
                  <div className="game-slot-desc">{item.meta.description}</div>
                  {item.maxDurability != null && item.durability != null && (
                    <div className={`game-durability${item.broken ? ' broken' : ''}`}>
                      Прочность: <b>{item.durability}</b> / {item.maxDurability}
                    </div>
                  )}
                  <div className="game-item-effects">
                    {item.meta.effects.map(effect => (
                      <span key={`${item.id}-${effect.kind}-${effect.description}`} className="game-item-effect-chip">
                        {effect.description}
                      </span>
                    ))}
                  </div>
                  <div className="game-item-actions game-item-actions--hint">
                    <span className="game-drag-hint">Перетащи в слот экипировки</span>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="game-items-empty">
              {equippedItems.some(entry => entry.inventoryItem)
                ? 'Все найденные предметы сейчас экипированы. Перетащи реликвию из слота сюда, чтобы снять ее.'
                : 'После боссов здесь будут появляться реликвии и артефакты для текущего забега.'}
            </div>
          )}
        </div>
      </details>

      <div className="game-status-row">
        <div className="game-equipped-inline">
          {equippedItems.map(entry => {
            const Icon: ComponentType<{ size?: number }> | null = entry.meta ? getGameItemIcon(entry.meta.icon) : null;
            const isDropTarget = hoveredSlot === entry.slot.key;

            return (
              <div
                key={entry.slot.key}
                className={`game-inline-slot${entry.meta ? ' filled' : ''}${entry.broken ? ' broken' : ''}${isDropTarget ? ' drop-target' : ''}`}
                onDragOver={(event) => {
                  if (!dragPayload) return;
                  allowDrop(event);
                  setHoveredSlot(entry.slot.key);
                }}
                onDragLeave={() => {
                  if (hoveredSlot === entry.slot.key) setHoveredSlot(null);
                }}
                onDrop={(event) => {
                  if (!dragPayload) return;
                  event.preventDefault();
                  moveToSlot(entry.slot.key);
                  endDrag();
                }}
              >
                <div className="game-inline-slot-label">{entry.slot.label}</div>
                {entry.meta && entry.inventoryItem ? (
                  <div
                    className={`game-inline-slot-body rarity-${entry.meta.rarity}${dragPayload?.itemId === entry.inventoryItem.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(event) => startDrag(event, entry.inventoryItem!.id, entry.slot.key)}
                    onDragEnd={endDrag}
                  >
                    <span className="game-item-badge">
                      {Icon && <Icon size={16} />}
                    </span>
                    <div className="game-inline-slot-text">
                      <strong>{entry.meta.shortName}</strong>
                      <small>
                        {getGameItemRarityStars(entry.meta.rarity)}
                        {' · '}
                        {entry.inventoryItem.maxDurability != null && entry.inventoryItem.durability != null
                          ? `${entry.inventoryItem.durability}/${entry.inventoryItem.maxDurability}`
                          : 'без износа'}
                        {entry.meta.bossOnly ? ' · боссы' : ''}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="game-inline-slot-empty">
                    {isDropTarget ? 'Отпусти предмет сюда' : 'Пусто'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
});
