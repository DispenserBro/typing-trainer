import { memo, useEffect, useState } from 'react';
import type { GameAchievementDefinition } from '../../../shared/types';
import { buildGameAchievementToastViewModels } from '../../../core/game/viewModel';
import { useI18n } from '../../contexts/I18nContext';

type GameAchievementToastStackProps = {
  achievements: GameAchievementDefinition[];
  onRemove?: (index: number) => void;
  autoHideDelay?: number;
};

type ToastState = {
  isHiding: boolean;
};

export const GameAchievementToastStack = memo(function GameAchievementToastStack({ 
  achievements, 
  onRemove,
  autoHideDelay = 4000,
}: GameAchievementToastStackProps) {
  const { t } = useI18n();
  const [toastStates, setToastStates] = useState<Map<number, ToastState>>(new Map());

  // Когда добавляются новые достижения, инициализируем их состояние
  useEffect(() => {
    setToastStates(prev => {
      const next = new Map(prev);
      achievements.forEach((_, index) => {
        if (!next.has(index)) {
          next.set(index, { isHiding: false });
        }
      });
      return next;
    });
  }, [achievements.length]);

  // Автоматически запускаем анимацию исчезновения
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    achievements.forEach((_, index) => {
      // Ждём autoHideDelay, потом устанавливаем isHiding = true
      const hideTimer = setTimeout(() => {
        setToastStates(prev => {
          const next = new Map(prev);
          const state = next.get(index);
          if (state) {
            next.set(index, { ...state, isHiding: true });
          }
          return next;
        });
      }, autoHideDelay);
      timers.push(hideTimer);

      // Ждём autoHideDelay + длительность анимации, потом удаляем
      const removeTimer = setTimeout(() => {
        onRemove?.(index);
      }, autoHideDelay + 400); // 400ms - длительность fade-out анимации
      timers.push(removeTimer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [achievements.length, autoHideDelay, onRemove]);

  const visibleAchievements = buildGameAchievementToastViewModels(achievements, toastStates);

  return (
    <div className="game-achievement-toast-stack" aria-live="polite" aria-atomic="true">
      {visibleAchievements.map(({ achievement, displayIndex, isHiding }) => (
        <div 
          key={`${achievement.id}-${displayIndex}`} 
          className={`game-achievement-toast ${isHiding ? 'hiding' : ''}`}
        >
          <div className="game-achievement-toast-title">{t('game.achievementToast.title')}</div>
          <div className="game-achievement-toast-name">{achievement.name}</div>
          <div className="game-achievement-toast-description">{achievement.description}</div>
        </div>
      ))}
    </div>
  );
});
