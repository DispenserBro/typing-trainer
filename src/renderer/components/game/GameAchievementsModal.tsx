import { memo, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { GameAchievementDefinition } from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';

type GameAchievementsModalProps = {
  open: boolean;
  unlockedAchievementIds: string[];
  achievementCatalog: GameAchievementDefinition[];
  onClose: () => void;
};

export const GameAchievementsModal = memo(function GameAchievementsModal({
  open,
  unlockedAchievementIds,
  achievementCatalog,
  onClose,
}: GameAchievementsModalProps) {
  const { t } = useI18n();
  // Фильтруем только игровые достижения
  const gameAchievements = useMemo(
    () => achievementCatalog.filter(a => (a.category ?? 'game') === 'game'),
    [achievementCatalog]
  );

  const unlockedCount = useMemo(
    () => gameAchievements.filter(a => unlockedAchievementIds.includes(a.id)).length,
    [gameAchievements, unlockedAchievementIds]
  );

  if (!open) return null;

  return (
    <ModalLayout
      className="game-achievements-modal"
      onClose={onClose}
      size="lg"
      scrollBody
      title={t('achievements.title')}
      description={<>{t('achievements.opened')} <b>{unlockedCount}</b> {t('achievements.of')} {gameAchievements.length}.</>}
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ActionRow>
      )}
    >
        <div className="game-achievements-list">
          {gameAchievements.map(achievement => {
            const unlocked = unlockedAchievementIds.includes(achievement.id);
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
        </div>
    </ModalLayout>
  );
});
