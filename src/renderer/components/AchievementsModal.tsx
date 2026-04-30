import { memo, useState, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { AchievementCategory, GameAchievementDefinition } from '../../shared/types';
import { buildAchievementsModalViewModel } from '../../core/achievements/viewModel';
import { useI18n } from '../contexts/I18nContext';
import { ActionRow } from './ui/ActionRow';
import { Button } from './ui/Button';
import { EmptyStateNotice } from './ui/EmptyStateNotice';
import { ModalLayout } from './ui/ModalLayout';
import { SelectInput } from './ui/SelectInput';

function getCategoryLabel(category: string, t: (key: string) => string): string {
  const key = `achievements.categories.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

type AchievementsModalProps = {
  open: boolean;
  unlockedAchievementIds: string[];
  achievementCatalog: GameAchievementDefinition[];
  /**
   * Если задан — показывать только достижения этой категории,
   * без возможности переключить вкладку.
   */
  categoryFilter?: AchievementCategory;
  onClose: () => void;
};

export const AchievementsModal = memo(function AchievementsModal({
  open,
  unlockedAchievementIds,
  achievementCatalog,
  categoryFilter,
  onClose,
}: AchievementsModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const viewModel = useMemo(() => buildAchievementsModalViewModel({
    achievementCatalog,
    activeCategory: activeTab,
    categoryFilter,
    unlockedAchievementIds,
  }), [achievementCatalog, activeTab, categoryFilter, unlockedAchievementIds]);

  if (!open) return null;

  return (
    <ModalLayout
      className="game-achievements-modal home-achievements-modal"
      onClose={onClose}
      size="full"
      title={t('achievements.title')}
      description={(
        <>
          {t('achievements.opened', { count: viewModel.unlockedCount, total: viewModel.totalCount })}{' '}
          <b>{viewModel.unlockedCount}</b> {t('achievements.of')} {viewModel.totalCount}
          {categoryFilter ? ` (${getCategoryLabel(categoryFilter, t)})` : ''}.
        </>
      )}
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ActionRow>
      )}
    >
        {/* Выпадающий список категорий — только когда categoryFilter не задан */}
        {!categoryFilter && viewModel.categories.length > 0 && (
          <div className="achievements-filter">
            <SelectInput
              className="achievements-category-select"
              value={activeTab === null ? '' : activeTab}
              onChange={(e) => setActiveTab(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">{t('achievements.all')}</option>
              {viewModel.categories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat, t)}
                </option>
              ))}
            </SelectInput>
          </div>
        )}

        <div className="game-achievements-list">
          {viewModel.items.map(({ achievement, unlocked }) => {
            return (
              <div key={achievement.id} className={`game-achievement-card${unlocked ? ' unlocked' : ''}`}>
                <div className="game-achievement-icon">
                  <Medal size={16} />
                </div>
                <div className="game-achievement-copy">
                  <div className="game-achievement-name">{achievement.name}</div>
                  <div className="game-achievement-description">{achievement.description}</div>
                </div>
                <div className="game-achievement-state">{unlocked ? t('achievements.state.open') : t('achievements.state.closed')}</div>
              </div>
            );
          })}
          {viewModel.items.length === 0 && (
            <EmptyStateNotice className="achievements-empty-copy" text={t('achievements.empty')} />
          )}
        </div>
    </ModalLayout>
  );
});
