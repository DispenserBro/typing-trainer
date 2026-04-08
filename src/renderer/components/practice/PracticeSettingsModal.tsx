import { NumberInput } from '../NumberInput';
import type {
  DailyGoalType,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeTrainingMode,
} from '../../../shared/types';

type PracticeSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  dailyGoalType: DailyGoalType;
  dailyGoalValue: number;
  onDailyGoalTypeChange: (value: DailyGoalType) => void;
  onDailyGoalValueChange: (value: number) => void;
  goalDisplay: number;
  spdLabel: string;
  unit: 'wpm' | 'cpm' | 'cps';
  onGoalSpeedChange: (value: number) => void;
  trainingMode: PracticeTrainingMode;
  onTrainingModeChange: (value: PracticeTrainingMode) => void;
  smartAdaptationEnabled: boolean;
  onSmartAdaptationEnabledChange: (value: boolean) => void;
  smartAdaptationStrength: PracticeAdaptationStrength;
  onSmartAdaptationStrengthChange: (value: PracticeAdaptationStrength) => void;
  smartAdaptationFocus: PracticeAdaptationFocus;
  onSmartAdaptationFocusChange: (value: PracticeAdaptationFocus) => void;
  noStepBack: boolean;
  onNoStepBackChange: (value: boolean) => void;
};

const adaptationStrengthLabel = {
  low: 'Мягкая',
  medium: 'Сбалансированная',
  high: 'Жесткая',
} satisfies Record<PracticeAdaptationStrength, string>;

const adaptationFocusLabel = {
  balanced: 'Баланс',
  chars: 'Буквы',
  bigrams: 'Сочетания',
  rhythm: 'Ритм',
} satisfies Record<PracticeAdaptationFocus, string>;

export function PracticeSettingsModal({
  open,
  onClose,
  dailyGoalType,
  dailyGoalValue,
  onDailyGoalTypeChange,
  onDailyGoalValueChange,
  goalDisplay,
  spdLabel,
  unit,
  onGoalSpeedChange,
  trainingMode,
  onTrainingModeChange,
  smartAdaptationEnabled,
  onSmartAdaptationEnabledChange,
  smartAdaptationStrength,
  onSmartAdaptationStrengthChange,
  smartAdaptationFocus,
  onSmartAdaptationFocusChange,
  noStepBack,
  onNoStepBackChange,
}: PracticeSettingsModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal practice-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="practice-settings-modal-head">
          <div>
            <h3>Настройки практики</h3>
            <p className="card-desc">Длина, темп и характер тренировки.</p>
          </div>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="practice-settings-grid">
          <div className="poption">
            <span className="poption-label">Цель на день</span>
            <div className="poption-row">
              <select
                className="select-minimal"
                value={dailyGoalType}
                onChange={e => onDailyGoalTypeChange(e.target.value as DailyGoalType)}
              >
                <option value="minutes">Минуты</option>
                <option value="sessions">Кол-во практик</option>
              </select>
              <NumberInput
                value={dailyGoalValue}
                min={1}
                max={999}
                className="w84"
                ariaLabel="Цель на день"
                onChange={(next) => onDailyGoalValueChange(Math.max(1, Math.round(next) || 15))}
              />
            </div>
          </div>

          <div className="poption">
            <span className="poption-label">Целевая скорость</span>
            <div className="poption-row">
              <NumberInput
                value={goalDisplay}
                min={1}
                max={9999}
                step={unit === 'cps' ? 0.1 : 1}
                className="w96"
                ariaLabel="Целевая скорость практики"
                onChange={(next) => onGoalSpeedChange(Math.max(1, next || 0))}
              />
              <span className="poption-hint">{spdLabel}</span>
            </div>
          </div>

          <div className="poption">
            <span className="poption-label">Режим практики</span>
            <div className="seg-group">
              <button
                className={`seg-btn${trainingMode === 'normal' ? ' active' : ''}`}
                onClick={() => onTrainingModeChange('normal')}
              >
                Обычная
              </button>
              <button
                className={`seg-btn${trainingMode === 'rhythm' ? ' active' : ''}`}
                onClick={() => onTrainingModeChange('rhythm')}
              >
                Ритм
              </button>
            </div>
            <span className="poption-hint">
              {trainingMode === 'rhythm' ? 'Короткий текст и ровный темп.' : 'Базовый режим на скорость и точность.'}
            </span>
          </div>

          <div className="poption practice-settings-wide">
            <label className="poption-toggle">
              <input
                type="checkbox"
                checked={smartAdaptationEnabled}
                onChange={e => onSmartAdaptationEnabledChange(e.target.checked)}
              />
              <span className="toggle-switch" />
              <span className="poption-toggle-text">
                <span className="poption-label">Умная адаптация</span>
                <span className="poption-hint">Подбирает текст под слабые места.</span>
              </span>
            </label>
          </div>

          <div className="poption practice-settings-wide">
            <span className="poption-label">Сила адаптации</span>
            <div className="seg-group">
              {(['low', 'medium', 'high'] as PracticeAdaptationStrength[]).map((value) => (
                <button
                  key={value}
                  className={`seg-btn${smartAdaptationStrength === value ? ' active' : ''}`}
                  onClick={() => onSmartAdaptationStrengthChange(value)}
                  disabled={!smartAdaptationEnabled}
                >
                  {adaptationStrengthLabel[value]}
                </button>
              ))}
            </div>
            <span className="poption-hint">
              {smartAdaptationEnabled
                ? 'Выше сила — больше акцент на слабых местах.'
                : 'Включите адаптацию, чтобы менять ее силу.'}
            </span>
          </div>

          <div className="poption practice-settings-wide">
            <span className="poption-label">Главный акцент</span>
            <div className="seg-group practice-focus-group">
              {(['balanced', 'chars', 'bigrams', 'rhythm'] as PracticeAdaptationFocus[]).map((value) => (
                <button
                  key={value}
                  className={`seg-btn${smartAdaptationFocus === value ? ' active' : ''}`}
                  onClick={() => onSmartAdaptationFocusChange(value)}
                  disabled={!smartAdaptationEnabled}
                >
                  {adaptationFocusLabel[value]}
                </button>
              ))}
            </div>
            <span className="poption-hint">
              {smartAdaptationFocus === 'balanced' && 'Баланс букв, сочетаний и темпа.'}
              {smartAdaptationFocus === 'chars' && 'Больше внимания отдельным буквам.'}
              {smartAdaptationFocus === 'bigrams' && 'Больше внимания переходам между буквами.'}
              {smartAdaptationFocus === 'rhythm' && 'Больше внимания ровности темпа.'}
            </span>
          </div>

          <div className="poption practice-settings-wide">
            <label className="poption-toggle">
              <input type="checkbox" checked={noStepBack} onChange={e => onNoStepBackChange(e.target.checked)} />
              <span className="toggle-switch" />
              <span className="poption-toggle-text">
                <span className="poption-label">Ни шагу назад</span>
                <span className="poption-hint">Backspace отключен.</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
