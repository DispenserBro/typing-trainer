import { ChipList } from '../ui/ChipList';

type GameEffectChipsProps = {
  effects: string[];
};

export function GameEffectChips({ effects }: GameEffectChipsProps) {
  return (
    <ChipList
      className="game-item-effects"
      chips={effects.map((effect) => ({
        id: effect,
        className: 'game-item-effect-chip',
        content: effect,
      }))}
    />
  );
}
