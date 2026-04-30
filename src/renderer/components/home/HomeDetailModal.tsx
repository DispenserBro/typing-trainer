import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { buildHomePageViewModel } from '../../../core/home/viewModel';
import type { TranslationParams } from '../../../shared/types';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';
import { HomeSummaryCard } from './HomeSummaryCard';

type HomeDetailModalId = 'season' | 'mode-focus' | 'records' | 'mastery' | 'goals' | 'streaks';

type HomeDetailMeta = {
  title: string;
  description: string;
};

type HomeViewModel = ReturnType<typeof buildHomePageViewModel>;

type HomeDetailModalProps = {
  activeDetailModal: HomeDetailModalId | null;
  detailMeta: HomeDetailMeta | null;
  formatSpeed: (value: number) => string;
  homeViewModel: HomeViewModel;
  onClose: () => void;
  onSwitchMode: (mode: string) => void;
  speedLabel: string;
  t: (key: string, params?: TranslationParams) => string;
};

export function HomeDetailModal({
  activeDetailModal,
  detailMeta,
  formatSpeed,
  homeViewModel,
  onClose,
  onSwitchMode,
  speedLabel,
  t,
}: HomeDetailModalProps) {
  if (!activeDetailModal || !detailMeta) return null;

  return (
    <ModalLayout
      className="home-detail-modal"
      headerWrapperClassName="home-detail-modal-head"
      bodyClassName="home-detail-modal-body"
      onClose={onClose}
      scrollBody
      size="wide"
      title={detailMeta.title}
      description={detailMeta.description}
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button onClick={onClose}>
            {t('common.close')}
          </Button>
        </ActionRow>
      )}
    >
          {activeDetailModal === 'season' && (
            <div className="home-detail-stack">
              <HomeSummaryCard
                label={homeViewModel.seasonSnapshot.definition.title}
                value={t('home.detail.season.progress', {
                  completed: homeViewModel.seasonSnapshot.completedCount,
                  total: homeViewModel.seasonSnapshot.totalCount,
                })}
                description={homeViewModel.seasonSnapshot.definition.description}
              />
              <div className="home-insight-grid">
                {homeViewModel.seasonSnapshot.goals.map((goal) => (
                  <HomeSummaryCard
                    key={goal.definition.id}
                    variant="insight"
                    label={goal.definition.title}
                    value={`${Math.round(goal.current)} / ${goal.target}`}
                    description={goal.completed ? t('home.detail.season.goalDone') : goal.definition.description}
                  />
                ))}
              </div>
            </div>
          )}

          {activeDetailModal === 'mode-focus' && (
            <div className="home-summary-grid">
              {homeViewModel.modeFocusDetailCards.map((card) => (
                <HomeSummaryCard
                  key={card.id}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                  details={card.details}
                  onClick={() => {
                    onClose();
                    onSwitchMode(card.actionMode);
                  }}
                />
              ))}
            </div>
          )}

          {activeDetailModal === 'records' && (
            <div className="home-summary-grid">
              {homeViewModel.personalRecordDetailCards.map((card) => (
                <HomeSummaryCard
                  key={card.id}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                />
              ))}
            </div>
          )}

          {activeDetailModal === 'mastery' && (
            <LayoutMasteryPanel
              snapshot={homeViewModel.layoutMastery}
              formatSpeed={formatSpeed}
              speedLabel={speedLabel}
            />
          )}

          {activeDetailModal === 'goals' && (
            <div className="home-summary-grid">
              {homeViewModel.homeGoals.map((goal) => (
                <HomeSummaryCard
                  key={goal.definition.id}
                  label={goal.definition.title}
                  value={`${Math.round(goal.current)}${goal.nextTarget != null ? ` / ${goal.nextTarget}` : ''}`}
                  description={goal.definition.description}
                />
              ))}
            </div>
          )}

          {activeDetailModal === 'streaks' && (
            <div className="home-insight-grid">
              {homeViewModel.homeStreaks.map((streak) => (
                <HomeSummaryCard
                  key={streak.definition.id}
                  variant="insight"
                  label={streak.definition.title}
                  value={streak.current}
                  description={t('home.detail.streaks.best', { count: streak.best })}
                />
              ))}
            </div>
          )}
    </ModalLayout>
  );
}
