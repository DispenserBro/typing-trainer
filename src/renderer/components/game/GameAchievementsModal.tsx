import { memo, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { GameAchievementDefinition } from '../../../shared/types';
import { buildGameAchievementsModalViewModel } from '../../../core/achievements/viewModel';
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
  const viewModel = useMemo(() => buildGameAchievementsModalViewModel({
    achievementCatalog,
    unlockedAchievementIds,
  }), [achievementCatalog, unlockedAchievementIds]);

  if (!open) return null;

  return (
    <ModalLayout
      className="game-achievements-modal"
      onClose={onClose}
      size="lg"
      scrollBody
      title={t('achievements.title')}
      description={<>{t('achievements.opened')} <b>{viewModel.unlockedCount}</b> {t('achievements.of')} {viewModel.totalCount}.</>}
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ActionRow>
      )}
    >
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
        </div>
    </ModalLayout>
  );
});
