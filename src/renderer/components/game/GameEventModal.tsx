import type { MutableRefObject, RefObject } from 'react';
import { Gift, Heart, ShoppingBag, TriangleAlert } from 'lucide-react';
import type {
  GameRunEventChoice,
  GameRunEventState,
} from '../../../shared/types';
import { getGameItemById, getGameItemIcon, getGameItemRarityStars } from '../../../core/game/items';
import { getEventKindLabel } from '../../../core/game/runUtils';

type GameEventModalProps = {
  pendingEvent: GameRunEventState;
  eventPending: boolean;
  eventChoiceRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  resultActionRef: RefObject<HTMLButtonElement | null>;
  onSelectEventChoice: (choice: GameRunEventChoice) => void;
  onContinue: () => void;
  onSkip: () => void;
};

function getEventIcon(kind: GameRunEventState['kind']) {
  if (kind === 'rest') return Heart;
  if (kind === 'cache') return Gift;
  if (kind === 'shop') return ShoppingBag;
  return TriangleAlert;
}

function isKeyboardActivation(event: React.KeyboardEvent<HTMLButtonElement>) {
  return event.key === 'Enter' || event.key === ' ';
}

export function GameEventModal({
  pendingEvent,
  eventPending,
  eventChoiceRefs,
  resultActionRef,
  onSelectEventChoice,
  onContinue,
  onSkip,
}: GameEventModalProps) {
  const EventIcon = getEventIcon(pendingEvent.kind);
  const handleChoicePointerDown = (event: React.PointerEvent<HTMLButtonElement>, choice: GameRunEventChoice) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectEventChoice(choice);
  };

  const handleChoiceKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, choice: GameRunEventChoice) => {
    if (!isKeyboardActivation(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectEventChoice(choice);
  };

  return (
    <div className="game-modal-panel">
      <div className="game-modal-head">
        <span className="game-modal-icon"><EventIcon size={18} /></span>
        <div>
          <div className="game-modal-kicker">{getEventKindLabel(pendingEvent.kind)}</div>
          <h3>{pendingEvent.title}</h3>
        </div>
      </div>
      <p className="game-modal-copy">{pendingEvent.description}</p>

      {eventPending ? (
        <>
          <div className="game-reward-grid">
            {pendingEvent.choices.map((choice, index) => {
            const choiceItem = choice.effect.grantItemId ? getGameItemById(choice.effect.grantItemId) : null;
            const ChoiceIcon = choiceItem ? getGameItemIcon(choiceItem.icon) : null;
            const effectDescriptions = [
              choice.effect.lifeDelta
                ? `${choice.effect.lifeDelta > 0 ? '+' : ''}${choice.effect.lifeDelta} HP`
                : null,
              choice.effect.repairEquippedBy
                ? `Ремонт +${choice.effect.repairEquippedBy}`
                : null,
              choice.effect.modifier?.description ?? null,
            ].filter((entry): entry is string => Boolean(entry));

            return (
              <div
                key={choice.id}
                className={`game-reward-card${choiceItem ? ` rarity-${choiceItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`}
              >
                <div className="game-reward-card-head">
                  <div className={`game-item-badge${choiceItem ? '' : ' letter'}`}>
                    {choiceItem
                      ? (ChoiceIcon && <ChoiceIcon size={18} />)
                      : choice.title.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="game-reward-copy">
                    <div className={`game-reward-rarity${choiceItem ? '' : ' special'}`}>
                      {choiceItem ? getGameItemRarityStars(choiceItem.rarity) : getEventKindLabel(pendingEvent.kind)}
                    </div>
                    <div className="game-reward-name">{choice.title}</div>
                    <div className="game-reward-kind">{choice.flavor}</div>
                  </div>
                </div>
                <div className="game-reward-body">
                  <div className="game-slot-desc">{choice.description}</div>
                  {choiceItem?.maxDurability != null && (
                    <div className="game-durability risky">
                      Прочность: <b>{choiceItem.maxDurability}</b> / {choiceItem.maxDurability}
                    </div>
                  )}
                  {(effectDescriptions.length > 0 || choiceItem) && (
                    <div className="game-item-effects">
                      {choiceItem?.effects.map(effect => (
                        <span key={`${choice.id}-${effect.description}`} className="game-item-effect-chip">
                          {effect.description}
                        </span>
                      ))}
                      {effectDescriptions.map(effect => (
                        <span key={`${choice.id}-${effect}`} className="game-item-effect-chip">
                          {effect}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  ref={node => { eventChoiceRefs.current[index] = node; }}
                  className="btn-accent"
                  disabled={choice.disabled}
                  onPointerDown={(event) => handleChoicePointerDown(event, choice)}
                  onKeyDown={(event) => handleChoiceKeyDown(event, choice)}
                  onClick={(event) => event.preventDefault()}
                >
                  Выбрать
                </button>
              </div>
            );
          })}
          </div>
          <div className="game-actions game-event-skip-row">
            <button className="btn-secondary btn-sm" onClick={onSkip}>
              Пропустить
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="game-reward-picked">{pendingEvent.resultText}</div>
          <div className="game-actions">
            <button ref={resultActionRef} className="btn-accent" onClick={onContinue}>
              Продолжить путь
            </button>
          </div>
        </>
      )}
    </div>
  );
}
