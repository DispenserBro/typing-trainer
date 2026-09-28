import type { CSSProperties } from 'react';

type GameCombatBurstProps = {
  kind: 'hit' | 'critical' | 'guard' | 'dodge' | 'victory';
};

/** Fixed-size CSS bursts: no animation loop or particles in persisted state. */
export function GameCombatBurst({ kind }: GameCombatBurstProps) {
  const count = kind === 'critical' || kind === 'victory' ? 18 : 10;
  return (
    <span className={`game-combat-burst game-combat-burst--${kind}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const angle = index * Math.PI * 2 / count;
        const radius = 30 + (index % 3) * 15;
        return (
          <i
            key={index}
            style={{
              '--particle-x': `${Math.cos(angle) * radius}px`,
              '--particle-y': `${Math.sin(angle) * radius}px`,
              '--particle-delay': `${index % 4 * 25}ms`,
            } as CSSProperties}
          />
        );
      })}
    </span>
  );
}
