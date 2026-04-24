import { ActionRow } from './ui/ActionRow';
import { Button } from './ui/Button';

type ResultFollowupActionsProps = {
  followupActionLabel?: string | null;
  onFollowupAction?: (() => void) | null;
  onRetry: () => void;
  onToPractice?: (() => void) | null;
  retryLabel: string;
  showToPractice?: boolean;
  toPracticeLabel: string;
};

export function ResultFollowupActions({
  followupActionLabel,
  onFollowupAction,
  onRetry,
  onToPractice,
  retryLabel,
  showToPractice = false,
  toPracticeLabel,
}: ResultFollowupActionsProps) {
  return (
    <ActionRow align="center" className="result-actions game-actions">
      <Button variant="accent" onClick={onRetry}>{retryLabel}</Button>
      {followupActionLabel && onFollowupAction ? (
        <Button onClick={onFollowupAction}>
          {followupActionLabel}
        </Button>
      ) : null}
      {showToPractice && onToPractice ? (
        <Button onClick={onToPractice}>
          {toPracticeLabel}
        </Button>
      ) : null}
    </ActionRow>
  );
}
