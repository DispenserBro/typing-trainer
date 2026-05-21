import { memo, useMemo, useState } from 'react';
import type {
  DragEvent as ReactDragEvent,
  ComponentType,
} from 'react';
import type {
  GameEquipmentSlot,
} from '../../../shared/types';
import {
  getGameItemIcon,
} from '../../../core/game/items/icons';
import { buildGameInventoryPanelViewModel } from '../../../core/game/pageUtils';
import type { EquippedEntry, InventoryEntry } from '../../../core/game/viewTypes';
import { useI18n } from '../../contexts/I18nContext';
import {
  formatGameItemMetaText,
  getGameEquipmentSlotLabel,
} from './gameText';
import { GameEffectChips } from './GameEffectChips';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';

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
  const { t } = useI18n();
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<GameEquipmentSlot | null>(null);
  const [inventoryDropActive, setInventoryDropActive] = useState(false);

  const inventoryViewModel = useMemo(
    () => buildGameInventoryPanelViewModel(inventoryItems, equippedItems),
    [equippedItems, inventoryItems],
  );
  const { visibleInventoryItems } = inventoryViewModel;

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
          <span>{t('game.inventory.title')}</span>
          <small>{t('game.inventory.itemsCount', { count: visibleInventoryItems.length })}</small>
        </summary>
        <p className="card-desc">
          {t('game.inventory.description')}
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
                      <div className="game-item-meta">{formatGameItemMetaText(item.meta, false, t)}</div>
                    </div>
                  </div>
                  <div className="game-slot-desc">{item.meta.description}</div>
                  {item.maxDurability != null && item.durability != null && (
                    <div className={`game-durability${item.broken ? ' broken' : ''}`}>
                      {t('game.inventory.durability')}: <b>{item.durability}</b> / {item.maxDurability}
                    </div>
                  )}
                  <GameEffectChips effects={item.meta.effects.map(effect => effect.description)} />
                  <div className="game-item-actions game-item-actions--hint">
                    <span className="game-drag-hint">{t('game.inventory.dragHint')}</span>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <EmptyStateNotice
              className="game-items-empty"
              text={inventoryViewModel.emptyReason === 'all-equipped'
                ? t('game.inventory.empty.allEquipped')
                : t('game.inventory.empty.afterBoss')}
            />
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
                <div className="game-inline-slot-label">{getGameEquipmentSlotLabel(entry.slot.key, t)}</div>
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
                        {formatGameItemMetaText(entry.meta, true, t)}
                        {' · '}
                        {entry.inventoryItem.maxDurability != null && entry.inventoryItem.durability != null
                          ? `${entry.inventoryItem.durability}/${entry.inventoryItem.maxDurability}`
                          : t('game.inventory.meta.noDurability')}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="game-inline-slot-empty">
                    {isDropTarget ? t('game.inventory.dropHere') : t('game.inventory.emptySlot')}
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
