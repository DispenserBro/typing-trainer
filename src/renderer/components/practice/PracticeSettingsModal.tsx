import { NumberInput } from '../NumberInput';
import { useI18n } from '../../contexts/I18nContext';
import { usePracticeContentModeLabels } from '../../hooks/practice/usePracticeContentModeLabels';
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
import {
  getPackFitMessage,
  getPackNotes,
  getPackRecommendedModeLabel,
  getPackRecommendationReason,
  getPackRepetitionRiskLabel,
} from './contentPackSummaryI18n';
import { ContentPackPreflightNotice } from './ContentPackPreflightNotice';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { SelectInput } from '../ui/SelectInput';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SettingsField } from '../ui/SettingsField';
import { SettingsToggle } from '../ui/SettingsToggle';

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
  const { t } = useI18n();
  const adaptationStrengthLabel: Record<PracticeAdaptationStrength, string> = {
    low: t('practice.settings.adaptationStrengthLabels.low'),
    medium: t('practice.settings.adaptationStrengthLabels.medium'),
    high: t('practice.settings.adaptationStrengthLabels.high'),
  };
  const adaptationFocusLabel: Record<PracticeAdaptationFocus, string> = {
    balanced: t('practice.settings.adaptationFocusLabels.balanced'),
    chars: t('practice.settings.adaptationFocusLabels.chars'),
    bigrams: t('practice.settings.adaptationFocusLabels.bigrams'),
    rhythm: t('practice.settings.adaptationFocusLabels.rhythm'),
  };
  const contentModeLabel = usePracticeContentModeLabels();
  const trainingModeOptions: { value: PracticeTrainingMode; label: string }[] = [
    { value: 'normal', label: t('practice.settings.normal') },
    { value: 'rhythm', label: t('practice.settings.rhythm') },
  ];
  const contentModeOptions: { value: PracticeContentMode; label: string }[] = ([
    'adaptive-words',
    'syllables',
    'pseudo-words',
    'sentences',
    'custom',
  ] as PracticeContentMode[]).map(value => ({
    value,
    label: value === 'custom' ? t('practice.contentModes.customPackShort') : contentModeLabel[value],
  }));
  const adaptationStrengthOptions: { value: PracticeAdaptationStrength; label: string; disabled: boolean }[] = ([
    'low',
    'medium',
    'high',
  ] as PracticeAdaptationStrength[]).map(value => ({
    value,
    label: adaptationStrengthLabel[value],
    disabled: !smartAdaptationEnabled,
  }));
  const adaptationFocusOptions: { value: PracticeAdaptationFocus; label: string; disabled: boolean }[] = ([
    'balanced',
    'chars',
    'bigrams',
    'rhythm',
  ] as PracticeAdaptationFocus[]).map(value => ({
    value,
    label: adaptationFocusLabel[value],
    disabled: !smartAdaptationEnabled,
  }));
  const repetitionRiskLabel = contentPackSummary && selectedContentPack
    ? getPackRepetitionRiskLabel(t, contentPackSummary.repetitionRisk).toLowerCase()
    : null;
  const recommendedModeLabel = contentPackSummary && selectedContentPack
    ? getPackRecommendedModeLabel(t, selectedContentPack, contentPackSummary)
    : null;
  const fitMessage = contentPackSummary
    ? getPackFitMessage(t, contentPackSummary)
    : null;
  const recommendationReason = contentPackSummary && selectedContentPack
    ? getPackRecommendationReason(t, selectedContentPack, contentPackSummary)
    : null;
  const packNotes = contentPackSummary && selectedContentPack
    ? getPackNotes(t, selectedContentPack, contentPackSummary)
    : [];
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal practice-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="practice-settings-modal-head">
          <SectionHeader title={t('practice.settings.title')} description={t('practice.settings.description')} />
          <Button size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <div className="practice-settings-grid">
          <SettingsField label={t('practice.settings.dailyGoal')}>
            <div className="poption-row">
              <SelectInput
                value={dailyGoalType}
                onChange={e => onDailyGoalTypeChange(e.target.value as DailyGoalType)}
              >
                <option value="minutes">{t('practice.settings.minutes')}</option>
                <option value="sessions">{t('practice.settings.sessionsCount')}</option>
              </SelectInput>
              <NumberInput
                value={dailyGoalValue}
                min={1}
                max={999}
                className="w84"
                ariaLabel={t('practice.settings.dailyGoal')}
                onChange={(next) => onDailyGoalValueChange(Math.max(1, Math.round(next) || 15))}
              />
            </div>
          </SettingsField>

          <SettingsField label={t('practice.settings.goalSpeed')}>
            <div className="poption-row">
              <NumberInput
                value={goalDisplay}
                min={1}
                max={9999}
                step={unit === 'cps' ? 0.1 : 1}
                className="w96"
                ariaLabel={t('practice.settings.goalSpeedAria')}
                onChange={(next) => onGoalSpeedChange(Math.max(1, next || 0))}
              />
              <span className="poption-hint">{spdLabel}</span>
            </div>
          </SettingsField>

          <SettingsField
            label={t('practice.settings.trainingMode')}
            hint={trainingMode === 'rhythm' ? t('practice.settings.rhythmHint') : t('practice.settings.normalHint')}
          >
            <SegmentedControl
              ariaLabel={t('practice.settings.trainingMode')}
              value={trainingMode}
              onChange={onTrainingModeChange}
              options={trainingModeOptions}
            />
          </SettingsField>

          <SettingsField
            className="practice-settings-wide"
            label={t('practice.settings.contentMode')}
            hint={(
              <>
                {contentMode === 'adaptive-words' && t('practice.settings.contentModeHints.adaptive-words')}
                {contentMode === 'syllables' && t('practice.settings.contentModeHints.syllables')}
                {contentMode === 'pseudo-words' && t('practice.settings.contentModeHints.pseudo-words')}
                {contentMode === 'sentences' && t('practice.settings.contentModeHints.sentences')}
                {contentMode === 'custom' && t('practice.settings.contentModeHints.custom')}
              </>
            )}
          >
            <SegmentedControl
              ariaLabel={t('practice.settings.contentMode')}
              className="practice-focus-group"
              value={contentMode}
              onChange={onContentModeChange}
              options={contentModeOptions}
            />
          </SettingsField>

          <SettingsField
            className="practice-settings-wide"
            label={t('practice.settings.contentPacks')}
            hint={importStatus
              ? importStatus
              : availableContentPacks.length > 0
                ? t('practice.settings.packsAvailable')
                : t('practice.settings.noPacks')}
          >
            <div className="poption-row">
              <SelectInput
                value={selectedContentPackId}
                onChange={e => onSelectedContentPackIdChange(e.target.value)}
                disabled={availableContentPacks.length === 0}
              >
                <option value="">{t('practice.settings.selectPack')}</option>
                {availableContentPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} · {pack.items.length}
                  </option>
                ))}
              </SelectInput>
              <Button size="sm" onClick={onImportCustomContent}>
                {t('practice.settings.importPack')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteCustomContent(selectedContentPackId)}
                disabled={!selectedContentPackId || availableContentPacks.find(pack => pack.id === selectedContentPackId)?.origin !== 'custom'}
              >
                {t('practice.settings.deletePack')}
              </Button>
            </div>
            {contentMode === 'custom' && selectedContentPack && contentPackSummary && (
              <div className="poption-hint practice-pack-details">
                <div>
                  {t('practice.settings.packPool', {
                    count: contentPackSummary.itemCount,
                    kind: selectedContentPack.kind,
                    scenario: contentScenarioLabel.toLowerCase(),
                    words: contentPackSummary.estimatedWordsPerText,
                  })}
                </div>
                <div>
                  {t('practice.settings.packRisk', {
                    risk: repetitionRiskLabel,
                    mode: recommendedModeLabel,
                  })}
                </div>
                <div>{fitMessage}</div>
                <div>{recommendationReason}</div>
                {packNotes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
                {contentPackPreflight && (
                  <>
                    <ContentPackPreflightNotice
                      preflight={contentPackPreflight}
                      actionsDisabled={contentPackActionsDisabled}
                      onContentPackAction={onContentPackAction}
                    />
                  </>
                )}
              </div>
            )}
          </SettingsField>

          <div className="poption practice-settings-wide">
            <SettingsToggle
              checked={smartAdaptationEnabled}
              onChange={onSmartAdaptationEnabledChange}
            >
              <span className="poption-toggle-text">
                <span className="poption-label">{t('practice.settings.smartAdaptation')}</span>
                <span className="poption-hint">{t('practice.settings.smartAdaptationHint')}</span>
              </span>
            </SettingsToggle>
          </div>

          <SettingsField
            className="practice-settings-wide"
            label={t('practice.settings.adaptationStrength')}
            hint={smartAdaptationEnabled
              ? t('practice.settings.adaptationStrengthHint')
              : t('practice.settings.adaptationStrengthDisabled')}
          >
            <SegmentedControl
              ariaLabel={t('practice.settings.adaptationStrength')}
              value={smartAdaptationStrength}
              onChange={onSmartAdaptationStrengthChange}
              options={adaptationStrengthOptions}
            />
          </SettingsField>

          <SettingsField
            className="practice-settings-wide"
            label={t('practice.settings.adaptationFocus')}
            hint={(
              <>
                {smartAdaptationFocus === 'balanced' && t('practice.settings.adaptationFocusHints.balanced')}
                {smartAdaptationFocus === 'chars' && t('practice.settings.adaptationFocusHints.chars')}
                {smartAdaptationFocus === 'bigrams' && t('practice.settings.adaptationFocusHints.bigrams')}
                {smartAdaptationFocus === 'rhythm' && t('practice.settings.adaptationFocusHints.rhythm')}
              </>
            )}
          >
            <SegmentedControl
              ariaLabel={t('practice.settings.adaptationFocus')}
              className="practice-focus-group"
              value={smartAdaptationFocus}
              onChange={onSmartAdaptationFocusChange}
              options={adaptationFocusOptions}
            />
          </SettingsField>

          <div className="poption practice-settings-wide">
            <SettingsToggle
              checked={noStepBack}
              onChange={onNoStepBackChange}
            >
              <span className="poption-toggle-text">
                <span className="poption-label">{t('practice.settings.noStepBack')}</span>
                <span className="poption-hint">{t('practice.settings.noStepBackHint')}</span>
              </span>
            </SettingsToggle>
          </div>
        </div>
      </div>
    </div>
  );
}
