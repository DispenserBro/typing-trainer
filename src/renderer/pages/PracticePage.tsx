import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generatePracticeText, getWorstChar, formatSpeed, speedLabel, filterYoWords, filterYoKeys } from '../engine';
import type { DailyGoalType, CharStat } from '../../shared/types';

function mergeCharStats(
  base: Record<string, CharStat> | undefined,
  extra: Record<string, CharStat> | undefined,
): Record<string, CharStat> {
  const merged: Record<string, CharStat> = { ...(base ?? {}) };

  for (const [ch, stat] of Object.entries(extra ?? {})) {
    const prev = merged[ch] ?? { hits: 0, misses: 0, totalTime: 0 };
    merged[ch] = {
      hits: prev.hits + stat.hits,
      misses: prev.misses + stat.misses,
      totalTime: prev.totalTime + stat.totalTime,
    };
  }

  return merged;
}

const PRACTICES_PER_UNLOCK = 3;

export function PracticePage() {
  const app = useApp();
  const { layouts, currentLayout, allWords, ngramModel, progress, settings,
    practiceSettings, fmtSpeed, spdLabel, savePracticeSetting,
    saveHistory, saveProgress, getLayoutProgress, getPracticeState } = app;

  const layout = layouts.layouts[currentLayout];
  const useYo = settings.useYo;

  // Filtered words and keys (ё handling)
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(layout?.practiceUnlockOrder ?? [], useYo),
    [layout, useYo],
  );

  const layoutProgress = getLayoutProgress();
  const practiceState = getPracticeState();
  const unlocked = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
  const weak = getWorstChar(progress.keyStats?.[currentLayout], unlocked);
  if (weak) practiceState.worstChar = weak;
  const fallbackWorstChar = weak ?? practiceState.worstChar ?? unlocked[0] ?? null;

  const [showOverlay, setShowOverlay] = useState(true);
  const [result, setResult] = useState<{
    wpm: number;
    acc: number;
    newLetter: boolean;
    openedLetter: string | null;
    worstChar: string | null;
    unlockProgress: number;
  } | null>(null);
  const [lastCharStats, setLastCharStats] = useState<Record<string, CharStat>>({});
  const [unlockModalLetter, setUnlockModalLetter] = useState<string | null>(null);

  const [practiceText, setPracticeText] = useState('');
  const previewKeyRef = useRef<string>('');
  const goalCPM = Math.max(1, practiceSettings.goalSpeedCpm || 150);

  // Convert CPM to display unit and back
  const unit = settings.speedUnit;
  const cpmToDisplay = (cpm: number) =>
    unit === 'wpm' ? Math.round(cpm / 5)
    : unit === 'cps' ? +(cpm / 60).toFixed(1)
    : Math.round(cpm);
  const displayToCpm = (val: number) =>
    unit === 'wpm' ? val * 5
    : unit === 'cps' ? val * 60
    : val;
  const goalDisplay = cpmToDisplay(goalCPM);

  const buildPracticePreview = useCallback(() => {
    const currentUnlocked = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
    const worstChar = getWorstChar(progress.keyStats?.[currentLayout], currentUnlocked);
    return generatePracticeText(words, currentUnlocked, worstChar, 25, ngramModel ?? undefined);
  }, [practiceUnlockOrder, layoutProgress.unlocked, progress.keyStats, currentLayout, words, ngramModel]);

  // Generate / regenerate text only when preview conditions actually change
  useEffect(() => {
    if (!layout || !words.length) return;
    const previewKey = [
      currentLayout,
      layoutProgress.unlocked,
      useYo ? 'yo' : 'no-yo',
      words.length,
      practiceUnlockOrder.join(''),
    ].join('|');
    if (previewKeyRef.current === previewKey) return;
    previewKeyRef.current = previewKey;
    setPracticeText(buildPracticePreview());
    setShowOverlay(true);
    setResult(null);
    setUnlockModalLetter(null);
  }, [currentLayout, layout, words.length, useYo, practiceUnlockOrder, layoutProgress.unlocked, buildPracticePreview]);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const goalAcc = 95;
    const goalWpm = goalCPM / 5;
    const enoughForProgress = wpm >= goalWpm && acc >= goalAcc;
    let unlockedNewLetter = false;

    if (layoutProgress.unlocked < practiceUnlockOrder.length) {
      if (enoughForProgress) {
        layoutProgress.unlockProgress += 1;
        if (layoutProgress.unlockProgress >= PRACTICES_PER_UNLOCK) {
          layoutProgress.unlocked++;
          layoutProgress.unlockProgress = 0;
          unlockedNewLetter = true;
        }
      }
    } else {
      layoutProgress.unlockProgress = 0;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (practiceState.lastDate !== today) {
      practiceState.sessionsToday = 0;
      practiceState.minutesToday = 0;
      practiceState.lastDate = today;
    }
    practiceState.sessionsToday++;
    practiceState.minutesToday = (practiceState.minutesToday || 0) + elapsed / 60;
    const mergedStats = mergeCharStats(progress.keyStats?.[currentLayout], ses?.charStats);
    const worstCharAfterFinish = getWorstChar(mergedStats, unlocked) ?? fallbackWorstChar;
    const openedLetter = unlockedNewLetter ? (practiceUnlockOrder[layoutProgress.unlocked - 1] ?? null) : null;
    practiceState.worstChar = worstCharAfterFinish;
    saveProgress(progress);
    saveHistory('practice', wpm, acc);
    if (ses?.charStats) setLastCharStats(ses.charStats);
    if (openedLetter) setUnlockModalLetter(openedLetter);
    setResult({
      wpm,
      acc,
      newLetter: unlockedNewLetter,
      openedLetter,
      worstChar: worstCharAfterFinish,
      unlockProgress: layoutProgress.unlockProgress,
    });
  }, [layoutProgress, practiceUnlockOrder, practiceState, currentLayout, progress, saveProgress, saveHistory, goalCPM, unlocked, fallbackWorstChar]);

  const { session, start, stop, handleKey, wpm, acc, renderTick, waitingForSpace } = useTypingSession({
    mode: 'practice',
    noStepBack: practiceSettings.noStepBack,
    onFinish,
  });

  // Click on text overlay to start
  const startPractice = useCallback(() => {
    if (session.active || !practiceText) return;
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    start(practiceText);
  }, [session.active, practiceText, start]);

  // Retry + immediately start (used when typing after result)
  const retryAndStart = useCallback(() => {
    const ul = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
    const w = getWorstChar(progress.keyStats?.[currentLayout], ul);
    const text = generatePracticeText(words, ul, w, 25, ngramModel ?? undefined);
    previewKeyRef.current = '';
    setPracticeText(text);
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    stop();
    start(text);
  }, [practiceUnlockOrder, layoutProgress.unlocked, progress, currentLayout, words, stop, start, ngramModel]);

  // keydown listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      const isBackspace = e.key === 'Backspace';
      if (unlockModalLetter) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          setUnlockModalLetter(null);
        }
        return;
      }
      // If result is shown — start new practice on printable key
      if (!session.active && result && isPrintable) {
        retryAndStart();
        return;
      }
      // If overlay is shown (first start) — start practice by typing
      if (!session.active && showOverlay && practiceText && isPrintable) {
        startPractice();
        return;
      }
      if (!session.active) return;
      if (isPrintable || isBackspace) handleKey(e);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session.active, result, showOverlay, practiceText, handleKey, retryAndStart, startPractice, unlockModalLetter]);

  // Live stats update interval
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  const retry = () => {
    const ul = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
    const w = getWorstChar(progress.keyStats?.[currentLayout], ul);
    const text = generatePracticeText(words, ul, w, 25, ngramModel ?? undefined);
    previewKeyRef.current = '';
    setPracticeText(text);
    setShowOverlay(true);
    setResult(null);
    setUnlockModalLetter(null);
    stop();
  };

  // Letter grid + goal
  const ks = progress.keyStats?.[currentLayout] || {};

  // Overall history stats (for top metrics row)
  const hist = progress.history?.[currentLayout] || [];
  const practiceHist = hist.filter(h => h.mode === 'practice');
  const last = practiceHist.length ? practiceHist[practiceHist.length - 1] : null;
  const top = practiceHist.reduce((m, h) => Math.max(m, h.wpm), 0);

  let speedDelta = 0, accDelta = 0;
  if (practiceHist.length >= 2) {
    const prev = practiceHist[practiceHist.length - 2];
    const curr = practiceHist[practiceHist.length - 1];
    speedDelta = Math.round((Number(fmtSpeed(curr.wpm)) - Number(fmtSpeed(prev.wpm))) * 10) / 10;
    accDelta = Math.round(curr.acc - prev.acc);
  }

  // Worst char stats helpers (for badge)
  const weakLower = weak ? weak.toLowerCase() : null;
  const displayedWorstChar = result?.worstChar ?? fallbackWorstChar;
  const displayedWorstLower = displayedWorstChar ? displayedWorstChar.toLowerCase() : null;
  const weakGlobal = displayedWorstLower ? (ks[displayedWorstLower] ?? null) : null;
  const weakLast = displayedWorstLower ? (lastCharStats[displayedWorstLower] ?? null) : null;

  function calcCPM(stat: CharStat | null): number {
    if (!stat || !stat.hits || !stat.totalTime) return 0;
    return 60000 / (stat.totalTime / stat.hits);
  }

  const weakLastCPM = calcCPM(weakLast);
  const weakGlobalCPM = calcCPM(weakGlobal);

  // Daily goal
  const goalVal = practiceSettings.dailyGoalValue || 15;

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Практика</h1></div>

      {/* Daily goal */}
      <div className="practice-stats-row">
        <div className="pstat daily-goal-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          {practiceSettings.dailyGoalType === 'sessions' ? (
            <div className="daily-goal-bar segments">
              {Array.from({ length: goalVal }).map((_, i) => (
                <span key={i} className={`daily-seg${i < practiceState.sessionsToday ? ' filled' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="daily-goal-bar smooth">
              <div className="daily-fill" style={{
                width: `${Math.min(100, Math.round((practiceState.minutesToday || 0) / goalVal * 100))}%`
              }} />
            </div>
          )}
          <span className="daily-goal-label">
            {practiceSettings.dailyGoalType === 'sessions'
              ? `${practiceState.sessionsToday} / ${goalVal}`
              : `${Math.round(practiceState.minutesToday || 0)} / ${goalVal} мин`
            }
          </span>
        </div>
      </div>

      {/* Practice options */}
      <details className="practice-options">
        <summary className="practice-options-summary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Настройки практики
        </summary>
        <div className="practice-options-body">
          <div className="poption">
            <span className="poption-label">Цель на день</span>
            <div className="poption-row">
              <select className="select-minimal" value={practiceSettings.dailyGoalType}
                onChange={e => savePracticeSetting('dailyGoalType', e.target.value as DailyGoalType)}>
                <option value="minutes">Минуты</option>
                <option value="sessions">Кол-во практик</option>
              </select>
              <input type="number" className="input-minimal w60"
                value={practiceSettings.dailyGoalValue} min={1} max={999}
                onChange={e => savePracticeSetting('dailyGoalValue', Math.max(1, parseInt(e.target.value) || 15))} />
            </div>
          </div>
          <div className="poption">
            <span className="poption-label">Целевая скорость</span>
            <div className="poption-row">
              <input type="number" className="input-minimal w60"
                value={goalDisplay} min={1} max={9999}
                onChange={e => {
                  const v = Math.max(1, parseFloat(e.target.value) || 0);
                  savePracticeSetting('goalSpeedCpm', Math.round(displayToCpm(v)));
                }} />
              <span className="poption-hint">{spdLabel}</span>
            </div>
          </div>
          <div className="poption">
            <label className="poption-toggle">
              <input type="checkbox" checked={practiceSettings.noStepBack}
                onChange={e => savePracticeSetting('noStepBack', e.target.checked)} />
              <span className="toggle-switch" />
              <span className="poption-toggle-text">
                <span className="poption-label">Ни шагу назад</span>
                <span className="poption-hint">Backspace отключён</span>
              </span>
            </label>
          </div>
        </div>
      </details>

      {/* Metrics — overall stats */}
      <div className="practice-metrics">
        <div className="metric">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span><b>{session.active ? fmtSpeed(wpm) : (last ? fmtSpeed(last.wpm) : '0')}</b> <small className="speed-unit">{spdLabel}</small></span>
        </div>
        <div className={`metric ${speedDelta >= 0 ? 'metric-positive' : 'metric-negative'}`}>
          <span><b>{speedDelta >= 0 ? '+' : ''}{speedDelta}</b> <small className="speed-unit">{spdLabel}</small></span>
        </div>
        <div className="metric">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          <span><b>{session.active ? Math.round(acc) : (last ? Math.round(last.acc) : '100')}</b>%</span>
        </div>
        <div className={`metric ${accDelta >= 0 ? 'metric-positive' : 'metric-negative'}`}>
          <span><b>{accDelta >= 0 ? '+' : ''}{accDelta}</b>%</span>
        </div>
      </div>

      {/* Summary badge — worst char */}
      <div className="practice-summary-row">
        <div className="summary-badge">
          <span className="badge-label">{displayedWorstChar ? displayedWorstChar.toUpperCase() : '—'}</span>
          <span>Last <b>{cpmToDisplay(weakLastCPM)}</b> <small className="speed-unit">{spdLabel}</small></span>
          <span>Top <b>{cpmToDisplay(weakGlobalCPM)}</b> <small className="speed-unit">{spdLabel}</small></span>
          <span>Goal <b>{goalDisplay}</b> <small className="speed-unit">{spdLabel}</small></span>
        </div>
      </div>

      {/* Letter grid */}
      <div className="letters-grid-wrap">
        <div className="letters-grid">
          {practiceUnlockOrder.map((ch, i) => {
            const stat = ks[ch.toLowerCase()];
            let charCPM = 0;
            if (stat && stat.hits > 0 && stat.totalTime > 0) {
              charCPM = 60000 / (stat.totalTime / stat.hits);
            }
            const hasStats = stat && stat.hits > 0;
            const ratio = goalCPM > 0 ? Math.min(1, charCPM / goalCPM) : 1;
            // If no stats yet, show full brightness; otherwise scale from 0.4→1.0
            const opacity = hasStats ? (0.4 + ratio * 0.6) : 1;
            const isWeak = ch === displayedWorstChar;
            const isUnlocked = i < layoutProgress.unlocked;
            const isNext = i === layoutProgress.unlocked;

            let cls = 'letter-chip ';
            const style: React.CSSProperties = {};
            if (isUnlocked) {
              cls += isWeak ? 'weak' : 'unlocked';
              style.opacity = opacity;
            } else if (isNext) {
              cls += 'locked';
              style.opacity = 0.7;
              style.borderWidth = '1px';
              style.borderStyle = 'dashed';
              style.borderColor = 'var(--accent)';
            } else {
              cls += 'locked';
            }

            return (
              <span key={ch} className={cls} style={style}
                title={isUnlocked
                  ? (isWeak ? `Проблемная · ${cpmToDisplay(charCPM)} ${spdLabel}` : `${cpmToDisplay(charCPM)} / ${goalDisplay} ${spdLabel}`)
                  : (isNext ? `До открытия: ${layoutProgress.unlockProgress}/${PRACTICES_PER_UNLOCK}` : '')}>
                {ch.toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* Text display */}
      <TextDisplay
        text={session.active ? session.text : practiceText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={!session.active ? (
          result
            ? `${fmtSpeed(result.wpm)} ${spdLabel} · ${Math.round(result.acc)}% · Хуже всего: ${result.worstChar?.toUpperCase() ?? '—'} · Букв: ${layoutProgress.unlocked}${result.newLetter ? ' · +1 буква!' : layoutProgress.unlocked < practiceUnlockOrder.length ? ` · До новой: ${result.unlockProgress}/${PRACTICES_PER_UNLOCK}` : ''}\nНажмите или начните печатать`
            : (showOverlay ? 'Нажмите здесь или начните печатать' : null)
        ) : null}
        onOverlayClick={result ? retryAndStart : startPractice}
      />

      {unlockModalLetter && (
        <div className="modal-overlay" onClick={() => setUnlockModalLetter(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Новая буква открыта</h3>
            <div className="unlock-letter-card mt-12">
              <div className="unlock-letter-value">{unlockModalLetter.toUpperCase()}</div>
              <p>Эта буква теперь доступна в режиме практики.</p>
              <p className="card-desc">Нажмите `Enter`, `Пробел` или кнопку ниже.</p>
              <button className="btn-accent" onClick={() => setUnlockModalLetter(null)}>
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
