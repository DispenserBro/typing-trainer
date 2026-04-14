import { memo, useMemo } from 'react';
import { Medal } from 'lucide-react';
import type { GameAchievementDefinition } from '../../../shared/types';

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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal game-achievements-modal">
        <h3>Достижения</h3>
        <p className="card-desc">
          Открыто <b>{unlockedCount}</b> из {gameAchievements.length}.
        </p>
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
                <div className="game-achievement-state">{unlocked ? 'Открыто' : 'Закрыто'}</div>
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
});
