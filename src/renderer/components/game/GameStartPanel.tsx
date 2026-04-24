import { NumberInput } from '../NumberInput';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/Button';
import { GameInfoChip } from './GameInfoChip';

type GameStartPanelProps = {
  activeSets: Array<{
    count: number;
    description: string;
    id: string;
    name: string;
  }>;
  ghostBestLevel: number | null;
  onChangeTargetSpeed: (next: number) => void;
  onStartDailyRun: () => void;
  onStartRun: () => void;
  speedUnit: 'cpm' | 'wpm' | 'cps';
  speedUnitLabel: string;
  targetSpeedDisplay: number;
};

export function GameStartPanel({
  activeSets,
  ghostBestLevel,
  onChangeTargetSpeed,
  onStartDailyRun,
  onStartRun,
  speedUnit,
  speedUnitLabel,
  targetSpeedDisplay,
}: GameStartPanelProps) {
  const { t } = useI18n();

  return (
    <form
      className="game-start-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onStartRun();
      }}
    >
      <div className="game-start-title">{t('game.start.title')}</div>
      <div className="game-start-subtitle">{t('game.start.subtitle')}</div>
      <label className="game-start-field">
        <span>{t('game.start.targetSpeed')}</span>
        <div className="game-start-input-row">
          <NumberInput
            value={targetSpeedDisplay}
            min={1}
            max={9999}
            step={speedUnit === 'cps' ? 0.1 : 1}
            className="w112"
            ariaLabel={t('game.start.targetSpeedAria')}
            onChange={onChangeTargetSpeed}
          />
          <small>{speedUnitLabel}</small>
        </div>
      </label>
      {activeSets.length > 0 && (
        <div className="game-set-bonuses">
          {activeSets.map(({ id, name, description, count }) => (
            <GameInfoChip
              key={id}
              className="game-set-chip"
              title={name}
              subtitle={<>{t('game.start.activeSetItems', { count })} · {description}</>}
            />
          ))}
        </div>
      )}
      <div className="game-start-actions">
        <Button type="submit" variant="accent">
          {t('game.start.actions.startRun')}
        </Button>
        <Button onClick={onStartDailyRun}>
          {t('game.start.actions.dailyRun')}
        </Button>
      </div>
      {ghostBestLevel && ghostBestLevel > 0 && (
        <div className="game-ghost-info">
          👻 {t('game.start.ghostBest', { level: ghostBestLevel })}
        </div>
      )}
    </form>
  );
}
