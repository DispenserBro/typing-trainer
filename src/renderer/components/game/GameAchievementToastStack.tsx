import { memo } from 'react';
import type { GameAchievementDefinition } from '../../../shared/types';

type GameAchievementToastStackProps = {
  achievements: GameAchievementDefinition[];
};

export const GameAchievementToastStack = memo(function GameAchievementToastStack({ achievements }: GameAchievementToastStackProps) {
  return (
    <div className="game-achievement-toast-stack" aria-live="polite" aria-atomic="true">
      {achievements.slice(0, 3).map(achievement => (
        <div key={`${achievement.id}-${achievements.indexOf(achievement)}`} className="game-achievement-toast">
          <div className="game-achievement-toast-title">Достижение получено</div>
          <div className="game-achievement-toast-name">{achievement.name}</div>
          <div className="game-achievement-toast-description">{achievement.description}</div>
        </div>
      ))}
    </div>
  );
});
