import type { ReactNode } from 'react';
import { GameEffectChips } from './GameEffectChips';

type GameRewardChoiceCardProps = {
  action: ReactNode;
  badge: ReactNode;
  body: ReactNode;
  cardClassName?: string;
  description: ReactNode;
  durability?: {
    current: number;
    label: ReactNode;
    max: number;
  } | null;
  effects?: string[];
  kind: ReactNode;
  name: ReactNode;
  rarity: ReactNode;
  special?: boolean;
};

export function GameRewardChoiceCard({
  action,
  badge,
  body,
  cardClassName,
  description,
  durability,
  effects = [],
  kind,
  name,
  rarity,
  special = false,
}: GameRewardChoiceCardProps) {
  return (
    <div className={['game-reward-card', cardClassName].filter(Boolean).join(' ')}>
      <div className="game-reward-card-head">
        <div className={`game-item-badge${special ? ' letter' : ''}`}>
          {badge}
        </div>
        <div className="game-reward-copy">
          <div className={`game-reward-rarity${special ? ' special' : ''}`}>{rarity}</div>
          <div className="game-reward-name">{name}</div>
          <div className="game-reward-kind">{kind}</div>
        </div>
      </div>
      <div className="game-reward-body">
        <div className="game-slot-desc">{description}</div>
        {durability ? (
          <div className="game-durability risky">
            {durability.label}: <b>{durability.current}</b> / {durability.max}
          </div>
        ) : null}
        <GameEffectChips effects={effects} />
        {body}
      </div>
      {action}
    </div>
  );
}
