import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generateText, filterYoWords, filterYoKeys } from '../../core/engine';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import type { GameAchievementDefinition } from '../../shared/types';
import { checkAchievements, type AchievementEvent } from '../../core/achievements/achievementEngine';
import { Medal } from 'lucide-react';

export function TestPage() {
  const { layouts, currentLayout, allWords, ngramModel, settings, fmtSpeed, spdLabel, saveHistory,
    gameAchievementCatalog, unlockedAchievementIds, unlockAchievements } = useApp();
  const useYo = settings.useYo;

  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);

  const handleAchievementEvent = useCallback((event: AchievementEvent) => {
    const newlyUnlockedIds = checkAchievements(
      gameAchievementCatalog,
      new Set(unlockedAchievementIds),
      event,
    );
    if (newlyUnlockedIds.length === 0) return;

    const unlockedObjects = unlockAchievements(newlyUnlockedIds);
    if (unlockedObjects.length > 0) {
      setAchievementToasts(prev => [...prev, ...unlockedObjects]);
    }
  }, [gameAchievementCatalog, unlockedAchievementIds, unlockAchievements]);

  const handleRemoveToast = useCallback((achievementIndex: number) => {
    setAchievementToasts(prev => prev.filter((_, idx) => idx !== achievementIndex));
  }, []);

  const testAchievementCatalog = useMemo(
    () => gameAchievementCatalog.filter(a => (a.category ?? 'game') === 'test'),
    [gameAchievementCatalog],
  );

  const testUnlockedCount = useMemo(
    () => testAchievementCatalog.filter(a => unlockedAchievementIds.includes(a.id)).length,
    [testAchievementCatalog, unlockedAchievementIds],
  );

  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const [duration, setDuration] = useState(60);
  const [showOverlay, setShowOverlay] = useState(true);
  const [result, setResult] = useState<{ wpm: number; acc: number; elapsed: number; chars: number; errors: number } | null>(null);
  const [timerValue, setTimerValue] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    saveHistory('test', wpm, acc, { charStats: ses?.charStats });
    setResult({ wpm, acc, elapsed, chars: ses.totalChars, errors: ses.errors });

    handleAchievementEvent({ type: 'test.completed', wpm, accuracy: acc });
  }, [saveHistory, handleAchievementEvent]);

  const { session, start, stop, handleKey, wpm, acc, waitingForSpace } = useTypingSession({ mode: 'test', onFinish });

  const startTest = useCallback(() => {
    const lay = layouts.layouts[currentLayout];
    if (!lay) return;
    const allChars = filterYoKeys(Object.values(lay.fingers).flat(), useYo);
    const text = generateText(words, allChars, 80, ngramModel ?? undefined);
    setShowOverlay(false);
    setResult(null);
    setTimerValue(duration);
    start(text);

    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = duration;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimerValue(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        // force finish
        setTimeout(() => {
          const s = session;
          if (s.active) {
            const elapsed = (performance.now() - s.startTime) / 1000;
            const w = (s.totalChars / 5) / (elapsed / 60);
            const a = s.totalChars > 0 ? (s.totalChars - s.errors) / s.totalChars * 100 : 100;
            onFinish(w, a, elapsed, s);
            stop();
          }
        }, 0);
      }
    }, 1000);
  }, [layouts, currentLayout, words, useYo, duration, start, stop, session, onFinish]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Live tick
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  return (
    <section className="mode-panel active">
      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        categoryFilter="test"
        onClose={() => setShowAchievements(false)}
      />
      <div className="panel-header">
        <div className="game-header-title">
          <h1>Тест скорости</h1>
          <button
            type="button"
            className="btn-secondary btn-sm game-achievements-button"
            onClick={() => setShowAchievements(true)}
          >
            <Medal size={14} />
            Достижения
            <span className="game-achievements-count">{testUnlockedCount}/{testAchievementCatalog.length}</span>
          </button>
        </div>
        <div className="header-right">
          <select className="select-minimal" value={duration}
            onChange={e => setDuration(Number(e.target.value))}>
            <option value={30}>30 сек</option>
            <option value={60}>60 сек</option>
            <option value={120}>2 мин</option>
          </select>
          <button className="btn-accent" onClick={startTest}>Начать</button>
        </div>
      </div>

      {session.active && (
        <div className="stats-bar">
          <div className="metric"><b>{timerValue}</b> с</div>
          <div className="metric"><b>{fmtSpeed(wpm)}</b> <small className="speed-unit">{spdLabel}</small></div>
          <div className="metric"><b>{Math.round(acc)}</b>%</div>
        </div>
      )}

      <TextDisplay
        text={session.active ? session.text : ''}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay ? 'Нажмите здесь или «Начать» для старта' : null}
        onOverlayClick={startTest}
      />

      {result && (
        <div className="result-card">
          <h3>Результат</h3>
          <div className="result-big">{fmtSpeed(result.wpm)} {spdLabel}</div>
          <p>Точность: <b>{Math.round(result.acc)}%</b></p>
          <p>Время: {Math.round(result.elapsed)} с · Символов: {result.chars} · Ошибок: {result.errors}</p>
          <button className="btn-accent" onClick={startTest}>Ещё раз</button>
        </div>
      )}
    </section>
  );
}

