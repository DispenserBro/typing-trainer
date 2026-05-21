import { useState } from 'react';
import type { CustomPresets, UserSettings } from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/Button';
import { SettingsActionList, SettingsActionRow } from '../ui/SettingsActionList';
import { SettingsCard } from '../ui/SettingsCard';
import { TextInput } from '../ui/TextInput';

type SettingsPresetsCardProps = {
  customPresets: CustomPresets;
  settings: UserSettings;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => string;
  deletePreset: (presetId: string) => void;
  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<string | null>;
};

export function SettingsPresetsCard({
  customPresets,
  applyPreset,
  saveCurrentAsPreset,
  deletePreset,
  exportConfig,
  importConfig,
}: SettingsPresetsCardProps) {
  const { t } = useI18n();
  const [newName, setNewName] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const entries = Object.entries(customPresets);

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    saveCurrentAsPreset(name);
    setNewName('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleImport = async () => {
    const err = await importConfig();
    if (err) { setImportMsg(t(err)); setTimeout(() => setImportMsg(''), 3000); }
    else { setImportMsg(t('settings.cards.presets.imported')); setTimeout(() => setImportMsg(''), 2000); }
  };

  return (
    <SettingsCard
      title={t('settings.cards.presets.title')}
      description={t('settings.cards.presets.description')}
    >
      <SettingsActionList>
        {entries.map(([id, preset]) => (
          <SettingsActionRow
            key={id}
            actions={!preset.builtIn ? (
              <Button
                variant="ghost"
                size="sm"
                className="preset-delete-btn"
                onClick={() => deletePreset(id)}
                title={t('settings.cards.presets.delete')}
              >
                ✕
              </Button>
            ) : null}
          >
            <Button
              size="sm"
              className="preset-apply-btn"
              onClick={() => applyPreset(id)}
              title={t('settings.cards.presets.applyPresetTitle', { name: preset.name })}
            >
              {preset.name}
            </Button>
          </SettingsActionRow>
        ))}
      </SettingsActionList>

      <div className="preset-save-row">
        <TextInput
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={t('settings.cards.presets.savePlaceholder')}
          maxLength={40}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <Button variant="accent" size="sm" onClick={handleSave} disabled={!newName.trim()}>
          {justSaved ? '✓' : t('settings.cards.presets.save')}
        </Button>
      </div>

      <div className="preset-io-row">
        <Button size="sm" onClick={() => exportConfig()}>{t('settings.cards.presets.exportConfig')}</Button>
        <Button size="sm" onClick={handleImport}>{t('settings.cards.presets.import')}</Button>
        {importMsg && <span className="card-desc preset-inline-message">{importMsg}</span>}
      </div>
    </SettingsCard>
  );
}
