import packageJson from '../../../../package.json';
import { useI18n } from '../../contexts/I18nContext';
import { SettingsCard } from '../ui/SettingsCard';
import { SummaryCard } from '../ui/SummaryCard';

type PackageAuthor = {
  name?: string;
  email?: string;
};

const packageAuthor = packageJson.author as PackageAuthor | undefined;

export function SettingsAboutCard() {
  const { t } = useI18n();

  return (
    <SettingsCard
      className="settings-card-full settings-about-card"
      headerWrapperClassName="settings-about-head"
      title={t('settings.cards.about.title')}
      description={t('settings.cards.about.description')}
    >
      <div className="settings-about-grid">
        <SummaryCard
          className="settings-about-item"
          label={t('settings.cards.about.appName')}
          labelClassName="settings-about-label"
          value={t('settings.cards.about.appNameValue')}
        />
        <SummaryCard
          className="settings-about-item"
          label={t('settings.cards.about.version')}
          labelClassName="settings-about-label"
          value={`v${packageJson.version}`}
        />
        <SummaryCard
          className="settings-about-item"
          label={t('settings.cards.about.author')}
          labelClassName="settings-about-label"
          note={packageAuthor?.email}
          noteClassName="card-desc"
          value={packageAuthor?.name ?? 'DispenserBro'}
        />
        <SummaryCard
          className="settings-about-item"
          label={t('settings.cards.about.stack')}
          labelClassName="settings-about-label"
          value={t('settings.cards.about.stackValue')}
        />
      </div>

      <div className="settings-about-note">
        <span className="settings-about-label">{t('settings.cards.about.storage')}</span>
        <p className="card-desc">{t('settings.cards.about.storageValue')}</p>
      </div>
    </SettingsCard>
  );
}
