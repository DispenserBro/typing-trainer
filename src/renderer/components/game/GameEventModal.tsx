import type { MutableRefObject, RefObject } from 'react';
import { Gift, Heart, ShoppingBag, TriangleAlert } from 'lucide-react';
import type {
  GameRunEventChoice,
  GameRunEventState,
} from '../../../shared/types';
import { getGameItemIcon } from '../../../core/game/items';
import { buildGameEventChoiceCardViewModels } from '../../../core/game/viewModel';
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
  const eventKindLabel = getGameEventKindLabel(pendingEvent.kind, t);
  const choiceCardViewModels = buildGameEventChoiceCardViewModels({
    choices: pendingEvent.choices,
    eventKindLabel,
    translate: t,
  });
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
          <div className="game-modal-kicker">{eventKindLabel}</div>
          <h3>{pendingEvent.title}</h3>
        </div>
      </div>
      <p className="game-modal-copy">{pendingEvent.description}</p>

      {eventPending ? (
        <>
          <div className="game-reward-grid">
            {choiceCardViewModels.map((choiceModel, index) => {
              const ChoiceIcon = choiceModel.iconKey ? getGameItemIcon(choiceModel.iconKey) : null;

              return (
                <GameRewardChoiceCard
                  key={choiceModel.choice.id}
                  cardClassName={choiceModel.cardClassName}
                  special={choiceModel.special}
                  badge={choiceModel.iconKey
                    ? (ChoiceIcon && <ChoiceIcon size={18} />)
                    : choiceModel.badgeLabel}
                  rarity={choiceModel.rarity}
                  name={choiceModel.name}
                  kind={choiceModel.kind}
                  description={choiceModel.description}
                  durability={choiceModel.durability}
                  effects={choiceModel.effects}
                  body={null}
                  action={(
                    <Button
                      ref={node => { eventChoiceRefs.current[index] = node; }}
                      variant="accent"
                      disabled={choiceModel.choice.disabled}
                      onPointerDown={(event) => handleChoicePointerDown(event, choiceModel.choice)}
                      onKeyDown={(event) => handleChoiceKeyDown(event, choiceModel.choice)}
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
