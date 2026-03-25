import { useState, useCallback, useEffect, useMemo } from 'react';
import { Heart, RotateCcw, Swords, Trophy } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generatePracticeText, getWorstChar, filterYoWords, filterYoKeys } from '../engine';

interface RoundResult {
  wpm: number;
  acc: number;
  passed: boolean;
  livesLeft: number;
  round: number;
}

export function GamePage() {
  const {
    layouts, currentLayout, allWords, ngramModel, progress, settings, practiceSettings,
    fmtSpeed, spdLabel, saveHistory, saveProgress, getLayoutProgress,
  } = useApp();

  const useYo = settings.useYo;
  const layout = layouts.layouts[currentLayout];
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(layout?.practiceUnlockOrder ?? [], useYo),
    [layout, useYo],
  );
  const layoutProgress = getLayoutProgress();
  const unlocked = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
  const weak = getWorstChar(progress.keyStats?.[currentLayout], unlocked);

  const [targetSpeedCpm, setTargetSpeedCpm] = useState(() => Math.max(1, practiceSettings.goalSpeedCpm || 150));
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [roundText, setRoundText] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);

  const goalWpm = targetSpeedCpm / 5;
  const unit = settings.speedUnit;
  const targetSpeedDisplay = unit === 'wpm' ? Math.round(targetSpeedCpm / 5)
    : unit === 'cps' ? +(targetSpeedCpm / 60).toFixed(1)
    : Math.round(targetSpeedCpm);

  const updateTargetSpeed = (value: number) => {
    const normalized = Math.max(1, Number.isFinite(value) ? value : 1);
    const cpm = unit === 'wpm' ? normalized * 5
      : unit === 'cps' ? normalized * 60
      : normalized;
    setTargetSpeedCpm(Math.round(cpm));
  };

  const buildRoundText = useCallback(() => {
    return generatePracticeText(words, unlocked, weak, 25, ngramModel ?? undefined);
  }, [words, unlocked, weak, ngramModel]);

  const onFinish = useCallback((wpm: number, acc: number) => {
    const passed = wpm >= goalWpm;
    const nextLives = passed ? lives : Math.max(0, lives - 1);

    saveHistory('game', wpm, acc);
    setCompletedRounds(prev => prev + 1);
    setLives(nextLives);
    setResult({ wpm, acc, passed, livesLeft: nextLives, round });
  }, [goalWpm, lives, round, saveHistory]);

  const { session, start, stop, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'game',
    onFinish,
  });

  const startRound = useCallback((nextRound: number, resetGame = false) => {
    if (!layout || !words.length || !unlocked.length) return;
    const text = buildRoundText();
    setRound(nextRound);
    setRoundText(text);
    setResult(null);
    if (resetGame) {
      setLives(3);
      setCompletedRounds(0);
      setGameStarted(true);
    }
    start(text);
  }, [layout, words.length, unlocked.length, buildRoundText, start]);

  const startGame = useCallback(() => {
    stop();
    startRound(1, true);
  }, [stop, startRound]);

  const continueGame = useCallback(() => {
    if (lives <= 0) return;
    stop();
    startRound(round + 1);
  }, [lives, stop, startRound, round]);

  useEffect(() => {
    if (!session.active) return;
    const handler = (e: KeyboardEvent) => handleKey(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session.active, handleKey]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  const gameLocked = gameStarted && lives > 0;
  const gameOver = gameStarted && lives <= 0 && !session.active;

  return (
    <section className="mode-panel active">
      <div className="panel-header">
        <h1>Игровой режим</h1>
        <div className="header-right">
          <input
            type="number"
            className="input-minimal w60"
            min={1}
            max={9999}
            disabled={gameLocked}
            value={targetSpeedDisplay}
            onChange={e => updateTargetSpeed(parseFloat(e.target.value) || 0)}
          />
          <span className="poption-hint">{spdLabel}</span>
          <button className="btn-accent" onClick={startGame}>
            {gameLocked ? 'Заново' : 'Старт'}
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="metric"><b>{Math.max(lives, 0)}</b> жизни</div>
        <div className="metric"><b>{round}</b> раунд</div>
        <div className="metric"><b>{layoutProgress.unlocked}</b> букв</div>
        <div className="metric"><b>{targetSpeedDisplay}</b> <small className="speed-unit">{spdLabel}</small></div>
        <div className="metric"><b>{session.active ? fmtSpeed(wpm) : (result ? fmtSpeed(result.wpm) : '0')}</b> <small className="speed-unit">{spdLabel}</small></div>
        <div className="metric"><b>{session.active ? Math.round(acc) : (result ? Math.round(result.acc) : 100)}</b>%</div>
      </div>

      <div className="game-lives-row">
        {Array.from({ length: 3 }, (_, idx) => (
          <span key={idx} className={`game-heart${idx < lives ? ' active' : ' lost'}`}>
            <Heart size={18} fill="currentColor" />
          </span>
        ))}
      </div>

      <TextDisplay
        text={session.active ? session.text : roundText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={!session.active && !gameStarted ? `Задайте цель и нажмите «Старт»\nТекст и открытые буквы берутся из прогресса практики` : null}
      />

      {result && !session.active && (
        <div className="result-card">
          <h3>{result.passed ? 'Раунд пройден' : (result.livesLeft > 0 ? 'Жизнь потеряна' : 'Игра окончена')}</h3>
          <div className="result-big">{fmtSpeed(result.wpm)} {spdLabel}</div>
          <p>Цель: <b>{targetSpeedDisplay} {spdLabel}</b> · Точность: <b>{Math.round(result.acc)}%</b></p>
          <p>{result.passed
            ? `Вы удержали все жизни и переходите к раунду ${result.round + 1}.`
            : `Скорость ниже цели. Осталось жизней: ${result.livesLeft}.`}
          </p>
          <div className="game-actions">
            {result.livesLeft > 0 ? (
              <button className="btn-accent" onClick={continueGame}>
                <Swords size={14} style={{ verticalAlign: 'middle' }} /> Следующий раунд
              </button>
            ) : (
              <button className="btn-accent" onClick={startGame}>
                <RotateCcw size={14} style={{ verticalAlign: 'middle' }} /> Сыграть ещё раз
              </button>
            )}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="card mt-16">
          <h4><Trophy size={16} style={{ verticalAlign: 'middle' }} /> Итог игры</h4>
          <p className="card-desc">Завершено раундов: {completedRounds}</p>
        </div>
      )}
    </section>
  );
}
