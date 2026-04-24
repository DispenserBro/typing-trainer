import { TextDisplay } from '../TextDisplay';

type ModeSessionStageProps = {
  errPositions: Set<number>;
  onOverlayClick: () => void;
  overlay: string | null;
  pos: number;
  text: string;
  waitingForSpace: boolean;
};

export function ModeSessionStage({
  errPositions,
  onOverlayClick,
  overlay,
  pos,
  text,
  waitingForSpace,
}: ModeSessionStageProps) {
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
