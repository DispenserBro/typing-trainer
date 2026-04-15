import type { ReactNode } from 'react';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
} from '../../../shared/types';

const CONTENT_MODE_LABELS: Record<PracticeContentMode, string> = {
  'adaptive-words': 'Слова',
  syllables: 'Слоги',
  'pseudo-words': 'Псевдослова',
  sentences: 'Предложения',
  custom: 'Набор',
};

type ModeQuickSettingsProps = {
  contentMode: PracticeContentMode;
  selectedContentPackId: string;
  availableContentPacks: PracticeContentPack[];
  selectedContentPack?: PracticeContentPack | null;
  contentPackSummary?: PracticeContentPackQualitySummary | null;
  contentPackPreflight?: PracticeContentPackPreflightSummary | null;
  onContentModeChange: (value: PracticeContentMode) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  onContentPackAction?: (action: PracticeContentPackQuickAction) => void;
  actionsDisabled?: boolean;
  extraControls?: ReactNode;
};

export function ModeQuickSettings({
  contentMode,
  selectedContentPackId,
  availableContentPacks,
  selectedContentPack,
  contentPackSummary,
  contentPackPreflight,
  onContentModeChange,
  onSelectedContentPackIdChange,
  onContentPackAction,
  actionsDisabled = false,
  extraControls,
}: ModeQuickSettingsProps) {
  return (
    <>
      <div className="practice-stats-row">
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">Материал</span>
          <select
            className="select-minimal"
            value={contentMode}
            onChange={(event) => onContentModeChange(event.target.value as PracticeContentMode)}
          >
            {Object.entries(CONTENT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {contentMode === 'custom' && (
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">Набор</span>
            <select
              className="select-minimal"
              value={selectedContentPackId}
              onChange={(event) => onSelectedContentPackIdChange(event.target.value)}
            >
              {availableContentPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
          </div>
        )}
        {extraControls}
      </div>
      {contentMode === 'custom' && selectedContentPack && contentPackSummary && (
        <div className="practice-stats-row">
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">
              {selectedContentPack.kind} · {contentPackSummary.itemCount} эл. · ~{contentPackSummary.estimatedWordsPerText} слов
            </span>
          </div>
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">
              Повторы: {contentPackSummary.repetitionRiskLabel.toLowerCase()} · Лучше: {contentPackSummary.recommendedModeLabel}
            </span>
          </div>
        </div>
      )}
      {contentMode === 'custom' && contentPackSummary && (
        <p className="card-desc" style={{ marginTop: 8 }}>
          {contentPackSummary.fitMessage} {contentPackSummary.recommendationReason}
        </p>
      )}
      {contentMode === 'custom' && contentPackPreflight && (
        <div style={{ marginTop: 10 }}>
          <p className="card-desc">
            <b>{contentPackPreflight.title}.</b> {contentPackPreflight.detail}
          </p>
          {onContentPackAction && contentPackPreflight.actions.length > 0 && (
            <div className="game-actions" style={{ marginTop: 8 }}>
              {contentPackPreflight.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={actionsDisabled}
                  title={action.description}
                  onClick={() => onContentPackAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
