import { memo, useState, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { AchievementCategory, GameAchievementDefinition } from '../../shared/types';
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
  // Диагностика: логируем каталог и разблокированные достижения
  useMemo(() => {
    if (open) {
      console.log('[AchievementsModal] Open with:', {
        catalogSize: achievementCatalog.length,
        unlockedCount: unlockedAchievementIds.length,
        unlockedIds: unlockedAchievementIds,
        achievements: achievementCatalog.slice(0, 3).map(a => ({ id: a.id, category: a.category })),
      });
    }
  }, [open, achievementCatalog, unlockedAchievementIds]);

  // Все уникальные категории из каталога, чтобы фильтры расширялись модами динамически
  const categories = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const ach of achievementCatalog) {
      if (ach.category) seen.add(ach.category);
    }
    return Array.from(seen);
  }, [achievementCatalog]);

  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Если фильтр задан — таб-бар не нужен, всегда фильтруем по categoryFilter.
  // Если не задан — используем activeTab (null = "Все").
  const effectiveFilter: string | null = categoryFilter ?? activeTab;

  const filtered = useMemo(() => {
    if (!effectiveFilter) return achievementCatalog;
    return achievementCatalog.filter(a => a.category === effectiveFilter);
  }, [achievementCatalog, effectiveFilter]);

  const unlockedSet = useMemo(() => new Set(unlockedAchievementIds), [unlockedAchievementIds]);
  const unlockedCount = filtered.filter(a => unlockedSet.has(a.id)).length;

  if (!open) return null;

  return (
    <ModalLayout
      className="game-achievements-modal home-achievements-modal"
      onClose={onClose}
      size="full"
      title={t('achievements.title')}
      description={(
        <>
          {t('achievements.opened', { count: unlockedCount, total: filtered.length })}{' '}
          <b>{unlockedCount}</b> {t('achievements.of')} {filtered.length}
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
        {!categoryFilter && categories.length > 0 && (
          <div className="achievements-filter">
            <SelectInput
              className="achievements-category-select"
              value={activeTab === null ? '' : activeTab}
              onChange={(e) => setActiveTab(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">{t('achievements.all')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat, t)}
                </option>
              ))}
            </SelectInput>
          </div>
        )}

        <div className="game-achievements-list">
          {filtered.map(achievement => {
            const unlocked = unlockedSet.has(achievement.id);
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
          {filtered.length === 0 && (
            <EmptyStateNotice className="achievements-empty-copy" text={t('achievements.empty')} />
          )}
        </div>
    </ModalLayout>
  );
});
