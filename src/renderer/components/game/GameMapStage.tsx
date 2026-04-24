import type { MutableRefObject, RefObject } from 'react';
import type {
  BattleState,
  GameAchievementDefinition,
  GameGhostRun,
  GameRunEventChoice,
  GameRunEventState,
  GameRunMapState,
  GameRunModifier,
  GameRunResult,
  GameRunRewardChoice,
} from '../../../shared/types';
import type { BossArchetypeConfig } from '../../../core/game/bossArchetypes';
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';
import type {
  LayoutMasteryResultSummary,
  ResultComparisonSummary,
} from '../../../core/motivation/records';
import { GameBattleOverlay } from './GameBattleOverlay';
import { GameEventModal } from './GameEventModal';
import { GameResultCard } from './GameResultCard';
import { GameRunMap } from './GameRunMap';
import { GameStartPanel } from './GameStartPanel';

type GameMapStageProps = {
  activeMap: GameRunMapState;
  activeTotalLevels: number;
  battleOverlayText: string | null;
  battleState: BattleState | null;
  bossLevelInterval: number;
  currentBossArchetype: BossArchetypeConfig | null;
  currentBossTimeLimit: number | null;
  dailySeed: string | null;
  effectiveTargetSpeedDisplay: string;
  eventChoiceRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  eventPending: boolean;
  fmtSpeed: (value: number) => string;
  gameAchievementCatalog: GameAchievementDefinition[];
  gameGoalHighlights: MotivationGoalSnapshot[];
  gameResultComparison: ResultComparisonSummary | null;
  gameResultViewModel: {
    comparison: ResultComparisonSummary | null;
    ghostComparison: { ghostWpm: number; delta: number; ahead: boolean } | null;
    isTerminalDailyRun: boolean;
    mapSelectionPending: boolean;
    masterySummary: LayoutMasteryResultSummary | null;
    motivationGoals: MotivationGoalSnapshot[];
    motivationStreaks: MotivationStreakSnapshot[];
    rewardPending: boolean;
  };
  gameStreakHighlights: MotivationStreakSnapshot[];
  ghostRun: GameGhostRun | null;
  hp: number;
  layoutProgressUnlocked: number;
  level: number;
  levelText: string;
  mapSelectionPending: boolean;
  onChangeTargetSpeed: (next: number) => void;
  onContinue: () => void;
  onRestart: () => void;
  onResumeSavedLevel: () => void;
  onRetry: () => void;
  onReturnToMainGame: () => void;
  onSelectEventChoice: (choice: GameRunEventChoice) => void;
  onSelectMapNode: (nodeId: string) => void;
  onSelectReward: (choice: GameRunRewardChoice) => void;
  onSkipEvent: () => void;
  onStartDailyRun: () => void;
  onStartRun: () => void;
  pendingEvent: GameRunEventState | null;
  result: GameRunResult | null;
  resultActionRef: RefObject<HTMLButtonElement | null>;
  rewardChoiceRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  rewardChoices: GameRunRewardChoice[] | null;
  selectableMapNodeIdsLength: number;
  selectedRewardMessage: string | null;
  sessionActive: boolean;
  sessionErrPositions: Set<number>;
  sessionPos: number;
  sessionStartTime: number;
  sessionText: string;
  sessionWpm: string;
  setBonuses: Array<{
    count: number;
    description: string;
    id: string;
    name: string;
  }>;
  showBattlePanel: boolean;
  showStartPanel: boolean;
  speedLabel: string;
  speedUnit: 'cpm' | 'wpm' | 'cps';
  targetSpeedDisplay: number;
  terminalGhostComparison: { ghostWpm: number; delta: number; ahead: boolean } | null;
  waitingForSpace: boolean;
};

export function GameMapStage({
  activeMap,
  activeTotalLevels,
  battleOverlayText,
  battleState,
  bossLevelInterval,
  currentBossArchetype,
  currentBossTimeLimit,
  dailySeed,
  effectiveTargetSpeedDisplay,
  eventChoiceRefs,
  eventPending,
  fmtSpeed,
  gameResultViewModel,
  ghostRun,
  hp,
  level,
  levelText,
  mapSelectionPending,
  onChangeTargetSpeed,
  onContinue,
  onRestart,
  onResumeSavedLevel,
  onRetry,
  onReturnToMainGame,
  onSelectEventChoice,
  onSelectMapNode,
  onSelectReward,
  onSkipEvent,
  onStartDailyRun,
  onStartRun,
  pendingEvent,
  result,
  resultActionRef,
  rewardChoiceRefs,
  rewardChoices,
  selectedRewardMessage,
  sessionActive,
  sessionErrPositions,
  sessionPos,
  sessionText,
  setBonuses,
  showBattlePanel,
  showStartPanel,
  speedLabel,
  speedUnit,
  targetSpeedDisplay,
  waitingForSpace,
}: GameMapStageProps) {
  return (
    <div className="game-map-stage">
      <GameRunMap map={activeMap} onSelectNode={onSelectMapNode} />

      {showBattlePanel && battleState && !battleState.finished && (
        <GameBattleOverlay
          battleState={battleState}
          level={level}
          levelText={levelText}
          overlayText={battleOverlayText}
          onResume={onResumeSavedLevel}
          sessionActive={sessionActive}
          sessionErrPositions={sessionErrPositions}
          sessionPos={sessionPos}
          sessionText={sessionText}
          waitingForSpace={waitingForSpace}
        />
      )}

      {showStartPanel && (
        <div className="game-map-overlay">
          <div className="game-map-overlay-card">
            <GameStartPanel
              activeSets={setBonuses}
              ghostBestLevel={ghostRun?.maxLevel ?? null}
              onChangeTargetSpeed={onChangeTargetSpeed}
              onStartDailyRun={onStartDailyRun}
              onStartRun={onStartRun}
              speedUnit={speedUnit}
              speedUnitLabel={speedLabel}
              targetSpeedDisplay={targetSpeedDisplay}
            />
          </div>
        </div>
      )}

      {pendingEvent && !result && (
        <div className="game-map-overlay">
          <GameEventModal
            pendingEvent={pendingEvent}
            eventPending={eventPending}
            eventChoiceRefs={eventChoiceRefs}
            resultActionRef={resultActionRef}
            onSelectEventChoice={onSelectEventChoice}
            onContinue={onContinue}
            onSkip={onSkipEvent}
          />
        </div>
      )}

      {result && !sessionActive && (
        <div className="game-map-overlay">
          <GameResultCard
            result={result}
            isDailyRun={Boolean(dailySeed)}
            speedLabel={speedLabel}
            formatSpeed={fmtSpeed}
            targetSpeedDisplay={targetSpeedDisplay}
            effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
            rewardChoices={rewardChoices}
            selectedRewardMessage={selectedRewardMessage}
            rewardPending={gameResultViewModel.rewardPending}
            mapSelectionPending={mapSelectionPending}
            totalLevels={activeTotalLevels}
            bossLevelInterval={bossLevelInterval}
            ghostComparison={gameResultViewModel.ghostComparison}
            comparison={gameResultViewModel.comparison}
            masterySummary={gameResultViewModel.masterySummary}
            motivationGoals={gameResultViewModel.motivationGoals}
            motivationStreaks={gameResultViewModel.motivationStreaks}
            isTerminalDailyRun={gameResultViewModel.isTerminalDailyRun}
            resultActionRef={resultActionRef}
            rewardChoiceRefs={rewardChoiceRefs}
            onContinue={onContinue}
            onRetry={onRetry}
            onRestart={onRestart}
            onReturnToMainGame={onReturnToMainGame}
            onSelectReward={onSelectReward}
          />
        </div>
      )}
    </div>
  );
}
