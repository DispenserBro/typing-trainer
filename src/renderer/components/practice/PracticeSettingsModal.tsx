import { NumberInput } from '../NumberInput';
import type {
  DailyGoalType,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
  PracticeContentMode,
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
  contentMode: PracticeContentMode;
  onContentModeChange: (value: PracticeContentMode) => void;
  availableContentPacks: PracticeContentPack[];
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackId: string;
  onSelectedContentPackIdChange: (value: string) => void;
  contentScenarioLabel: string;
  contentPackSummary: PracticeContentPackQualitySummary | null;
  contentPackPreflight: PracticeContentPackPreflightSummary | null;
  onContentPackAction: (action: PracticeContentPackQuickAction) => void;
  contentPackActionsDisabled?: boolean;
  onImportCustomContent: () => void;
  onDeleteCustomContent: (packId: string) => void;
  importStatus: string | null;
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

const contentModeLabel = {
  'adaptive-words': 'Слова',
  syllables: 'Слоги',
  'pseudo-words': 'Псевдослова',
  sentences: 'Предложения',
  custom: 'Мой набор',
} satisfies Record<PracticeContentMode, string>;

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
  contentMode,
  onContentModeChange,
  availableContentPacks,
  selectedContentPack,
  selectedContentPackId,
  onSelectedContentPackIdChange,
  contentScenarioLabel,
  contentPackSummary,
  contentPackPreflight,
  onContentPackAction,
  contentPackActionsDisabled = false,
  onImportCustomContent,
  onDeleteCustomContent,
  importStatus,
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
            <span className="poption-label">Тренировочный материал</span>
            <div className="seg-group practice-focus-group">
              {(['adaptive-words', 'syllables', 'pseudo-words', 'sentences', 'custom'] as PracticeContentMode[]).map((value) => (
                <button
                  key={value}
                  className={`seg-btn${contentMode === value ? ' active' : ''}`}
                  onClick={() => onContentModeChange(value)}
                >
                  {value === 'custom' ? 'Набор' : contentModeLabel[value]}
                </button>
              ))}
            </div>
            <span className="poption-hint">
              {contentMode === 'adaptive-words' && 'Адаптивные словари с учётом слабых мест.'}
              {contentMode === 'syllables' && 'Короткие слоги и фонетические связки.'}
              {contentMode === 'pseudo-words' && 'Синтетические слова из доступных букв.'}
              {contentMode === 'sentences' && 'Короткие предложения и связный набор текста.'}
              {contentMode === 'custom' && 'Встроенные, аддонные и пользовательские наборы контента.'}
            </span>
          </div>

          <div className="poption practice-settings-wide">
            <span className="poption-label">Наборы контента</span>
            <div className="poption-row">
              <select
                className="select-minimal"
                value={selectedContentPackId}
                onChange={e => onSelectedContentPackIdChange(e.target.value)}
                disabled={availableContentPacks.length === 0}
              >
                <option value="">Выберите набор…</option>
                {availableContentPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} · {pack.items.length}
                  </option>
                ))}
              </select>
              <button className="btn-secondary btn-sm" onClick={onImportCustomContent}>
                Импорт TXT/JSON
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => onDeleteCustomContent(selectedContentPackId)}
                disabled={!selectedContentPackId || availableContentPacks.find(pack => pack.id === selectedContentPackId)?.origin !== 'custom'}
              >
                Удалить
              </button>
            </div>
            <span className="poption-hint">
              {importStatus
                ? importStatus
                : availableContentPacks.length > 0
                  ? 'Базовые, аддонные и импортированные наборы доступны в одном списке.'
                  : 'Пока нет доступных наборов контента.'}
            </span>
            {contentMode === 'custom' && selectedContentPack && contentPackSummary && (
              <div className="poption-hint" style={{ marginTop: 8 }}>
                <div>
                  Пул: <b>{contentPackSummary.itemCount}</b> эл. · Тип: <b>{selectedContentPack.kind}</b> ·
                  Сейчас для <b>{contentScenarioLabel.toLowerCase()}</b> ожидается около <b>{contentPackSummary.estimatedWordsPerText}</b> слов.
                </div>
                <div>
                  Риск повторов: <b>{contentPackSummary.repetitionRiskLabel.toLowerCase()}</b>. Лучше всего подходит: <b>{contentPackSummary.recommendedModeLabel}</b>.
                </div>
                <div>{contentPackSummary.fitMessage}</div>
                <div>{contentPackSummary.recommendationReason}</div>
                {contentPackSummary.notes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
                {contentPackPreflight && (
                  <>
                    <div style={{ marginTop: 8 }}>
                      <b>{contentPackPreflight.title}.</b> {contentPackPreflight.detail}
                    </div>
                    {contentPackPreflight.actions.length > 0 && (
                      <div className="game-actions" style={{ marginTop: 8 }}>
                        {contentPackPreflight.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={contentPackActionsDisabled}
                            title={action.description}
                            onClick={() => onContentPackAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
