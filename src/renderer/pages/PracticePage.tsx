import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generatePracticeText, getWorstChar, formatSpeed, speedLabel, filterYoWords, filterYoKeys } from '../engine';
import type { DailyGoalType, TextDisplayMode, CharStat } from '../../shared/types';
import { AlignJustify, MoveRight } from 'lucide-react';

export function PracticePage() {
  const app = useApp();
  const { layouts, currentLayout, allWords, progress, settings,
    practiceSettings, fmtSpeed, spdLabel, savePracticeSetting,
    saveHistory, saveProgress, getPracticeState } = app;

  const layout = layouts.layouts[currentLayout];
  const useYo = settings.useYo;

  // Filtered words and keys (ё handling)
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(layout?.practiceUnlockOrder ?? [], useYo),
    [layout, useYo],
  );

  const pr = getPracticeState();
  const unlocked = practiceUnlockOrder.slice(0, pr.unlocked);
  const weak = getWorstChar(progress.keyStats?.[currentLayout], unlocked);
  if (weak) pr.worstChar = weak;

  const [showOverlay, setShowOverlay] = useState(true);
  const [result, setResult] = useState<{ wpm: number; acc: number; newLetter: boolean } | null>(null);
  const [lastCharStats, setLastCharStats] = useState<Record<string, CharStat>>({});

  const [practiceText, setPracticeText] = useState('');

  // Generate / regenerate text when layout or allWords change
  useEffect(() => {
    if (!layout || !words.length) return;
    const ul = practiceUnlockOrder.slice(0, pr.unlocked);
    const w = getWorstChar(progress.keyStats?.[currentLayout], ul);
    setPracticeText(generatePracticeText(words, ul, w));
    setShowOverlay(true);
    setResult(null);
  }, [currentLayout, layout, words, useYo]);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const goalCPM = parseInt(
      (document.getElementById('goalSpeed') as HTMLInputElement)?.value ?? '150', 10
    ) || 150;
    const goalAcc = parseInt(
      (document.getElementById('goalAcc') as HTMLInputElement)?.value ?? '95', 10
    ) || 95;
    const goalWpm = goalCPM / 5;

    const canUnlock = wpm >= goalWpm && acc >= goalAcc;
    if (canUnlock && pr.unlocked < practiceUnlockOrder.length) {
      pr.unlocked++;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (pr.lastDate !== today) { pr.sessionsToday = 0; pr.minutesToday = 0; pr.lastDate = today; }
    pr.sessionsToday++;
    pr.minutesToday = (pr.minutesToday || 0) + elapsed / 60;
    pr.worstChar = getWorstChar(progress.keyStats?.[currentLayout], unlocked);
    saveProgress(progress);
    saveHistory('practice', wpm, acc);
    if (ses?.charStats) setLastCharStats(ses.charStats);
    setResult({ wpm, acc, newLetter: canUnlock });
  }, [pr, layout, currentLayout, progress, saveProgress, saveHistory]);

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
    start(practiceText);
  }, [session.active, practiceText, start]);

  // Retry + immediately start (used when typing after result)
  const retryAndStart = useCallback(() => {
    const ul = practiceUnlockOrder.slice(0, pr.unlocked);
    const w = getWorstChar(progress.keyStats?.[currentLayout], ul);
    const text = generatePracticeText(words, ul, w);
    setPracticeText(text);
    setShowOverlay(false);
    setResult(null);
    stop();
    start(text);
  }, [practiceUnlockOrder, pr.unlocked, progress, currentLayout, words, stop, start]);

  // keydown listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      const isBackspace = e.key === 'Backspace';
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
  }, [session.active, result, showOverlay, practiceText, handleKey, retryAndStart, startPractice]);

  // Live stats update interval
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  const retry = () => {
    const ul = practiceUnlockOrder.slice(0, pr.unlocked);
    const w = getWorstChar(progress.keyStats?.[currentLayout], ul);
    const text = generatePracticeText(words, ul, w);
    setPracticeText(text);
    setShowOverlay(true);
    setResult(null);
    stop();
  };

  // Letter grid + goal
  const ks = progress.keyStats?.[currentLayout] || {};
  const goalCPM = 150; // default

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
  const weakGlobal = weakLower ? (ks[weakLower] ?? null) : null;
  const weakLast = weakLower ? (lastCharStats[weakLower] ?? null) : null;

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
                <span key={i} className={`daily-seg${i < pr.sessionsToday ? ' filled' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="daily-goal-bar smooth">
              <div className="daily-fill" style={{
                width: `${Math.min(100, Math.round((pr.minutesToday || 0) / goalVal * 100))}%`
              }} />
            </div>
          )}
          <span className="daily-goal-label">
            {practiceSettings.dailyGoalType === 'sessions'
              ? `${pr.sessionsToday} / ${goalVal}`
              : `${Math.round(pr.minutesToday || 0)} / ${goalVal} мин`
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
          <div className="poption">
            <span className="poption-label">Вид текста</span>
            <div className="seg-group">
              <button title="Блок" className={`seg-btn${practiceSettings.textDisplay === 'block' ? ' active' : ''}`}
                onClick={() => savePracticeSetting('textDisplay', 'block')}><AlignJustify size={16} /></button>
              <button title="Бегущая строка" className={`seg-btn${practiceSettings.textDisplay === 'running' ? ' active' : ''}`}
                onClick={() => savePracticeSetting('textDisplay', 'running')}><MoveRight size={16} /></button>
            </div>
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
          <span className="badge-label">{weak ? weak.toUpperCase() : '—'}</span>
          <span>Last <b>{Math.round(weakLastCPM)}</b> <small className="speed-unit">CPM</small></span>
          <span>Top <b>{Math.round(weakGlobalCPM)}</b> <small className="speed-unit">CPM</small></span>
          <span>Goal <b>{goalCPM}</b> <small className="speed-unit">CPM</small></span>
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
            const isWeak = ch === weak;
            const isUnlocked = i < pr.unlocked;
            const isNext = i === pr.unlocked;

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
                title={isUnlocked ? (isWeak ? `Проблемная · ${Math.round(charCPM)} CPM` : `${Math.round(charCPM)} / ${goalCPM} CPM`) : ''}>
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
        running={practiceSettings.textDisplay === 'running'}
        waitingForSpace={waitingForSpace}
        overlay={!session.active ? (
          result
            ? `${fmtSpeed(result.wpm)} ${spdLabel} · ${Math.round(result.acc)}% · Букв: ${pr.unlocked}${result.newLetter ? ' · +1 буква!' : ''}\nНажмите или начните печатать`
            : (showOverlay ? 'Нажмите здесь или начните печатать' : null)
        ) : null}
        onOverlayClick={result ? retryAndStart : startPractice}
      />
    </section>
  );
}
