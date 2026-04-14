import { memo, useState, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { AchievementCategory, GameAchievementDefinition } from '../../shared/types';

const CATEGORY_LABELS: Record<string, string> = {
  game: 'Игра',
  practice: 'Практика',
  lessons: 'Уроки',
  test: 'Тест',
};

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal game-achievements-modal">
        <h3>Достижения</h3>
        <p className="card-desc">
          Открыто <b>{unlockedCount}</b> из {filtered.length}
          {categoryFilter ? ` (${getCategoryLabel(categoryFilter)})` : ''}.
        </p>

        {/* Выпадающий список категорий — только когда categoryFilter не задан */}
        {!categoryFilter && categories.length > 0 && (
          <div className="achievements-filter">
            <select
              className="achievements-category-select"
              value={activeTab === null ? '' : activeTab}
              onChange={(e) => setActiveTab(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">Все достижения</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
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
                <div className="game-achievement-state">{unlocked ? 'Открыто' : 'Закрыто'}</div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="card-desc" style={{ padding: '1rem 0' }}>
              Нет достижений в этой категории.
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
});
