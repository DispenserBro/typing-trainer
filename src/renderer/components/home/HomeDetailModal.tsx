import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { describeHomeRecord } from '../../../core/motivation/records';
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
  formatDate: (value: string | number | Date | undefined, options?: Intl.DateTimeFormatOptions, fallback?: string) => string;
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
  formatDate,
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
              {homeViewModel.modeFocusSnapshots.map((snapshot) => (
                <HomeSummaryCard
                  key={snapshot.id}
                  label={snapshot.title}
                  value={snapshot.bestEntry
                    ? `${formatSpeed(snapshot.bestEntry.wpm)} ${speedLabel}`
                    : t('home.common.noAttempts')}
                  description={snapshot.attempts > 0
                    ? t('home.detail.modeFocus.attempts', {
                        count: snapshot.attempts,
                        date: snapshot.lastEntry
                          ? formatDate(snapshot.lastEntry.date, {
                              day: '2-digit',
                              month: '2-digit',
                            }, t('home.common.noDate'))
                          : t('home.common.noDate'),
                      })
                    : snapshot.description}
                  details={[snapshot.recommendation]}
                  onClick={() => {
                    onClose();
                    onSwitchMode(snapshot.actionMode);
                  }}
                />
              ))}
            </div>
          )}

          {activeDetailModal === 'records' && (
            <div className="home-summary-grid">
              {homeViewModel.personalRecordCards.map((card) => (
                <HomeSummaryCard
                  key={card.id}
                  label={card.title}
                  value={card.record
                    ? `${formatSpeed(card.record.entry.wpm)} ${speedLabel}`
                    : t('home.common.noData')}
                  description={card.record
                    ? `${Math.round(card.record.entry.acc)}% · ${describeHomeRecord(card.record, t)}`
                    : card.subtitle}
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
