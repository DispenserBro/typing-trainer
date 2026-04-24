import type { PracticeContentPackPreflightSummary, PracticeContentPackQuickAction } from '../../../shared/types';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { UiNotice } from '../ui/UiNotice';

type ContentPackPreflightNoticeProps = {
  actionsDisabled?: boolean;
  onContentPackAction?: (action: PracticeContentPackQuickAction) => void;
  preflight: PracticeContentPackPreflightSummary;
};

export function ContentPackPreflightNotice({
  actionsDisabled = false,
  onContentPackAction,
  preflight,
}: ContentPackPreflightNoticeProps) {
  return (
    <UiNotice
      className="content-pack-preflight-notice"
      tone={preflight.severity}
      title={preflight.title}
      detail={preflight.detail}
      actions={onContentPackAction && preflight.actions.length > 0 ? (
        <ActionRow className="content-pack-preflight-actions game-actions">
          {preflight.actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              disabled={actionsDisabled}
              title={action.description}
              onClick={() => onContentPackAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </ActionRow>
      ) : null}
    />
  );
}
