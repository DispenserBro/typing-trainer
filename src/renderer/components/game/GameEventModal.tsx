import type { MutableRefObject, RefObject } from 'react';
import { Gift, Heart, ShoppingBag, TriangleAlert } from 'lucide-react';
import type {
  GameRunEventChoice,
  GameRunEventState,
} from '../../../shared/types';
import { getGameItemById, getGameItemIcon, getGameItemRarityStars } from '../../../core/game/items';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { GameRewardChoiceCard } from './GameRewardChoiceCard';
import { getGameEventKindLabel } from './gameText';

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
  const { t } = useI18n();
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
          <div className="game-modal-kicker">{getGameEventKindLabel(pendingEvent.kind, t)}</div>
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
                ? `${choice.effect.lifeDelta > 0 ? '+' : ''}${choice.effect.lifeDelta} ${t('game.hud.hpShort')}`
                : null,
              choice.effect.repairEquippedBy
                ? t('game.event.repairBonus', { count: choice.effect.repairEquippedBy })
                : null,
              choice.effect.modifier?.description ?? null,
            ].filter((entry): entry is string => Boolean(entry));

            return (
              <GameRewardChoiceCard
                key={choice.id}
                cardClassName={`${choiceItem ? `rarity-${choiceItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`.trim()}
                special={!choiceItem}
                badge={choiceItem
                  ? (ChoiceIcon && <ChoiceIcon size={18} />)
                  : choice.title.slice(0, 1).toUpperCase()}
                rarity={choiceItem ? getGameItemRarityStars(choiceItem.rarity) : getGameEventKindLabel(pendingEvent.kind, t)}
                name={choice.title}
                kind={choice.flavor}
                description={choice.description}
                durability={choiceItem?.maxDurability != null ? {
                  current: choiceItem.maxDurability,
                  label: t('game.inventory.durability'),
                  max: choiceItem.maxDurability,
                } : null}
                effects={[
                  ...(choiceItem?.effects.map(effect => effect.description) ?? []),
                  ...effectDescriptions,
                ]}
                body={null}
                action={(
                  <Button
                  ref={node => { eventChoiceRefs.current[index] = node; }}
                  variant="accent"
                  disabled={choice.disabled}
                  onPointerDown={(event) => handleChoicePointerDown(event, choice)}
                  onKeyDown={(event) => handleChoiceKeyDown(event, choice)}
                  onClick={(event) => event.preventDefault()}
                >
                  {t('game.event.selectChoice')}
                </Button>
                )}
              />
            );
          })}
          </div>
          <ActionRow align="center" className="game-actions game-event-skip-row">
            <Button size="sm" onClick={onSkip}>
              {t('game.event.skip')}
            </Button>
          </ActionRow>
        </>
      ) : (
        <>
          <div className="game-reward-picked">{pendingEvent.resultText}</div>
          <ActionRow align="center" className="game-actions">
            <Button ref={resultActionRef} variant="accent" onClick={onContinue}>
              {t('game.event.continuePath')}
            </Button>
          </ActionRow>
        </>
      )}
    </div>
  );
}
