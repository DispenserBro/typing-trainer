import { TextDisplay } from '../TextDisplay';

type PracticeSessionStageProps = {
  errPositions: Set<number>;
  onOverlayClick: () => void;
  overlay: string | null;
  pos: number;
  text: string;
  waitingForSpace: boolean;
};

export function PracticeSessionStage({
  errPositions,
  onOverlayClick,
  overlay,
  pos,
  text,
  waitingForSpace,
}: PracticeSessionStageProps) {
  return (
    <TextDisplay
      text={text}
      pos={pos}
      errPositions={errPositions}
      waitingForSpace={waitingForSpace}
      overlay={overlay}
      onOverlayClick={onOverlayClick}
    />
  );
}
