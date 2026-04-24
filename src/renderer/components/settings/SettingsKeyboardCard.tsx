import { NumberInput } from '../NumberInput';
import type { UserSettings } from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { SettingsCard } from '../ui/SettingsCard';
import { SettingsField } from '../ui/SettingsField';
import { SettingsToggle } from '../ui/SettingsToggle';

export function SettingsKeyboardCard({
  settings,
  keyboardPreviewActive,
  setKeyboardPreviewActive,
  saveSetting,
}: {
  settings: UserSettings;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsCard title={t('settings.cards.keyboard.title')}>
      <SettingsToggle
        checked={settings.showKeyboard}
        onChange={checked => {
          saveSetting('showKeyboard', checked);
          if (!checked) {
            setKeyboardPreviewActive(false);
          }
        }}
        label={t('settings.cards.keyboard.showKeyboard')}
      />
      {settings.showKeyboard && (
        <>
          <SettingsToggle
            className="settings-keyboard-toggle-row"
            checked={settings.showHands}
            onChange={checked => saveSetting('showHands', checked)}
          >
            <span className="settings-beta-row">
              <span className="poption-toggle-text">{t('settings.cards.keyboard.showHands')}</span>
              <span className="settings-beta-tag">{t('settings.cards.keyboard.beta')}</span>
            </span>
          </SettingsToggle>

          {settings.showHands && (
            <SettingsField className="settings-keyboard-option-row" label={t('settings.cards.keyboard.handsOpacity')}>
              <div className="poption-row">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.handsOpacity}
                  onChange={e => saveSetting('handsOpacity', Number(e.target.value))}
                  className="range-input"
                  aria-label={t('settings.cards.keyboard.handsOpacity')}
                />
                <span className="poption-hint">{settings.handsOpacity}%</span>
              </div>
            </SettingsField>
          )}

          <SettingsField className="settings-keyboard-option-row" label={t('settings.cards.keyboard.keyStrokeWidth')}>
            <div className="poption-row">
              <NumberInput
                value={settings.keyStrokeWidth}
                min={0}
                max={4}
                step={0.5}
                className="w72"
                ariaLabel={t('settings.cards.keyboard.keyStrokeWidth')}
                onChange={(next) => saveSetting('keyStrokeWidth', Math.round(next * 10) / 10)}
              />
              <span className="poption-hint">px</span>
            </div>
          </SettingsField>

          <SettingsField
            className="settings-keyboard-option-row"
            label={t('settings.cards.keyboard.verticalOffset')}
            hint={t('settings.cards.keyboard.verticalOffsetHint')}
          >
            <div className="poption-row">
              <NumberInput
                value={settings.keyboardPanelOffset}
                min={-100}
                max={100}
                step={1}
                emptyValue={0}
                className="w96"
                ariaLabel={t('settings.cards.keyboard.verticalOffset')}
                onChange={(next) => saveSetting('keyboardPanelOffset', Math.round(next))}
              />
              <span className="poption-hint">%</span>
            </div>
          </SettingsField>

          <SettingsField
            className="settings-keyboard-option-row"
            label={t('settings.cards.keyboard.panelZoom')}
            hint={t('settings.cards.keyboard.panelZoomHint')}
          >
            <div className="poption-row">
              <NumberInput
                value={settings.keyboardPanelZoom}
                min={10}
                max={300}
                step={1}
                emptyValue={100}
                className="w96"
                ariaLabel={t('settings.cards.keyboard.panelZoom')}
                onChange={(next) => saveSetting('keyboardPanelZoom', Math.round(next))}
              />
              <span className="poption-hint">%</span>
            </div>
          </SettingsField>

          <ActionRow className="settings-keyboard-actions">
            <Button
              size="sm"
              className={keyboardPreviewActive ? 'active' : undefined}
              onClick={() => setKeyboardPreviewActive(!keyboardPreviewActive)}
            >
              {keyboardPreviewActive ? t('settings.cards.keyboard.previewClose') : t('settings.cards.keyboard.previewOpen')}
            </Button>
          </ActionRow>
        </>
      )}
    </SettingsCard>
  );
}
