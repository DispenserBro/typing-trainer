import { useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import type { FingerName, PracticeInsightAggregate, PracticeBigramInsight } from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { formatSpeed, speedLabel } from '../engine';
import { getRhythmScore } from '../practiceInsights';

Chart.register(...registerables);

const FINGER_LABELS: Record<FingerName, string> = {
  index_left: 'Левый указательный',
  index_right: 'Правый указательный',
  middle_left: 'Левый средний',
  middle_right: 'Правый средний',
  ring_left: 'Левый безымянный',
  ring_right: 'Правый безымянный',
  pinky_left: 'Левый мизинец',
  pinky_right: 'Правый мизинец',
};

const ROW_LABELS = {
  top: 'Верхний ряд',
  middle: 'Средний ряд',
  bottom: 'Нижний ряд',
} as const;

function formatAggregateMeta(entry: PracticeInsightAggregate) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

function formatBigramMeta(entry: PracticeBigramInsight) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTransitionTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

export function StatsPage() {
  const { progress, currentLayout, layouts, settings, practiceInsights } = useApp();
  const hist = progress.history?.[currentLayout] || [];
  const ks = progress.keyStats?.[currentLayout];
  const unit = settings.speedUnit;
  const layout = layouts.layouts[currentLayout];
  const allChars = layout ? Object.values(layout.fingers).flat() : [];
  const layoutInsights = practiceInsights.byLayout[currentLayout];

  const speedRef = useRef<HTMLCanvasElement>(null);
  const accRef = useRef<HTMLCanvasElement>(null);
  const speedChartRef = useRef<Chart | null>(null);
  const accChartRef = useRef<Chart | null>(null);
  const chartLabels = useMemo(() => hist.map((_, i) => i + 1), [hist]);
  const speedData = useMemo(() => hist.map(h => Number(formatSpeed(h.wpm, unit))), [hist, unit]);
  const accData = useMemo(() => hist.map(h => h.acc), [hist]);

  useEffect(() => {
    const bodyStyles = getComputedStyle(document.body);
    const accent = bodyStyles.getPropertyValue('--accent').trim() || '#e8751a';
    const green = bodyStyles.getPropertyValue('--green').trim() || '#4caf50';
    const gridColor = '#2a2a2a';
    const tickColor = '#666';

    if (speedRef.current && !speedChartRef.current) {
      speedChartRef.current = new Chart(speedRef.current, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: speedLabel(unit),
            data: speedData,
            borderColor: accent,
            backgroundColor: accent,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            pointHoverRadius: 3,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
            x: { ticks: { color: tickColor }, grid: { color: gridColor } },
          },
        },
      });
    }

    if (accRef.current && !accChartRef.current) {
      accChartRef.current = new Chart(accRef.current, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Accuracy %',
            data: accData,
            borderColor: green,
            backgroundColor: green,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            pointHoverRadius: 3,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 50, max: 100, ticks: { color: tickColor }, grid: { color: gridColor } },
            x: { ticks: { color: tickColor }, grid: { color: gridColor } },
          },
        },
      });
    }

    return () => {
      speedChartRef.current?.destroy();
      speedChartRef.current = null;
      accChartRef.current?.destroy();
      accChartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bodyStyles = getComputedStyle(document.body);
    const accent = bodyStyles.getPropertyValue('--accent').trim() || '#e8751a';
    const green = bodyStyles.getPropertyValue('--green').trim() || '#4caf50';

    if (speedChartRef.current) {
      speedChartRef.current.data.labels = chartLabels;
      speedChartRef.current.data.datasets[0].label = speedLabel(unit);
      speedChartRef.current.data.datasets[0].data = speedData;
      speedChartRef.current.data.datasets[0].borderColor = accent;
      speedChartRef.current.data.datasets[0].backgroundColor = accent;
      speedChartRef.current.update('none');
    }

    if (accChartRef.current) {
      accChartRef.current.data.labels = chartLabels;
      accChartRef.current.data.datasets[0].data = accData;
      accChartRef.current.data.datasets[0].borderColor = green;
      accChartRef.current.data.datasets[0].backgroundColor = green;
      accChartRef.current.update('none');
    }
  }, [accData, chartLabels, unit, speedData, settings.theme]);

  // Worst keys
  const worstKeys = useMemo(() => {
    if (!ks) return [];
    return Object.entries(ks)
      .map(([ch, d]) => {
        const total = d.hits + d.misses;
        const errRate = total > 0 ? d.misses / total : 0;
        const avgTime = d.hits > 0 ? Math.round(d.totalTime / d.hits) : 0;
        return { ch, errRate, avgTime, total };
      })
      .filter(x => x.total >= 3)
      .sort((a, b) => (b.errRate * 100 + b.avgTime / 10) - (a.errRate * 100 + a.avgTime / 10))
      .slice(0, 5);
  }, [ks]);

  // Heatmap
  const heatmap = useMemo(() => {
    if (!ks) return [];
    let minT = Infinity, maxT = 0;
    for (const ch of allChars) {
      if (ks[ch] && ks[ch].hits > 0) {
        const t = ks[ch].totalTime / ks[ch].hits;
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }
    if (minT === Infinity) minT = 0;
    if (maxT === 0) maxT = 1;
    return allChars.map(ch => {
      const d = ks[ch];
      const avg = d && d.hits > 0 ? Math.round(d.totalTime / d.hits) : 0;
      const ratio = maxT > minT ? (avg - minT) / (maxT - minT) : 0;
      const r = Math.round(ratio * 255);
      const g = Math.round((1 - ratio) * 200);
      const bg = avg > 0 ? `rgba(${r},${g},60,0.7)` : 'var(--surface2)';
      return { ch, avg, bg };
    });
  }, [ks, allChars]);

  const weakestChars = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.chars)
      .map(([char, entry]) => ({ char, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 5);
  }, [layoutInsights]);

  const weakestBigrams = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.bigrams)
      .map(([bigram, entry]) => ({ bigram, entry, ...formatBigramMeta(entry) }))
      .filter(item => item.attempts >= 3 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 5);
  }, [layoutInsights]);

  const weakestFingers = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.fingers)
      .filter((entry): entry is [FingerName, PracticeInsightAggregate] => Boolean(entry[1]))
      .map(([finger, entry]) => ({ finger, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 4);
  }, [layoutInsights]);

  const rowInsights = useMemo(() => {
    if (!layoutInsights) return [];
    return (Object.entries(layoutInsights.rows) as Array<[keyof typeof ROW_LABELS, PracticeInsightAggregate]>)
      .map(([row, entry]) => ({ row, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness);
  }, [layoutInsights]);

  const rhythmInsight = useMemo(() => {
    if (!layoutInsights || layoutInsights.rhythm.samples <= 0) return null;
    const score = getRhythmScore(layoutInsights.rhythm);
    return {
      score,
      avgInterval: Math.round(layoutInsights.rhythm.averageInterval),
      avgDeviation: Math.round(layoutInsights.rhythm.averageDeviation),
      samples: layoutInsights.rhythm.samples,
    };
  }, [layoutInsights]);

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Статистика</h1></div>

      <div className="stats-grid">
        <div className="card">
          <h4>Прогресс скорости</h4>
          <div className="stats-chart-wrap">
            <canvas ref={speedRef} />
          </div>
        </div>
        <div className="card">
          <h4>Прогресс точности</h4>
          <div className="stats-chart-wrap">
            <canvas ref={accRef} />
          </div>
        </div>
      </div>

      <div className="card mt-16">
        <h4>Топ-5 проблемных клавиш</h4>
        {worstKeys.length === 0 ? (
          <p style={{ opacity: 0.5 }}>Пока нет данных</p>
        ) : (
          <div className="worst-keys-grid">
            {worstKeys.map(k => (
              <div className="worst-key-card" key={k.ch}>
                <span className="wk-char">{k.ch === ' ' ? '␣' : k.ch}</span>
                <span className="wk-err">ош: {Math.round(k.errRate * 100)}%</span>
                <span className="wk-time">{k.avgTime}мс</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-16">
        <h4>Скорость по клавишам</h4>
        <div className="keys-heatmap">
          {heatmap.map(h => (
            <span key={h.ch} className="hm-key" style={{ background: h.bg }} title={`${h.ch}: ${h.avg}мс`}>
              {h.ch}
            </span>
          ))}
        </div>
      </div>

      <div className="card mt-16">
        <h4>Аналитика умной практики</h4>
        <p className="card-desc">
          Здесь видно, почему система считает конкретные буквы, сочетания и зоны клавиатуры слабыми.
        </p>
        {!layoutInsights || (!weakestChars.length && !weakestBigrams.length && !weakestFingers.length && !rowInsights.length && !rhythmInsight) ? (
          <p style={{ opacity: 0.5 }}>Пока недостаточно данных. Заверши несколько практик, чтобы увидеть аналитику.</p>
        ) : (
          <div className="smart-stats-grid">
            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>Слабые буквы</h5>
                <span>Ошибки + медленное нажатие</span>
              </div>
              {weakestChars.length === 0 ? (
                <p className="smart-stats-empty">Пока все ровно.</p>
              ) : (
                <div className="smart-stats-list">
                  {weakestChars.map(item => (
                    <div key={item.char} className="smart-stat-row">
                      <div className="smart-stat-main">
                        <span className="smart-stat-token mono">{item.char.toUpperCase()}</span>
                        <span className="smart-stat-reason">
                          {item.errorRate}% ошибок · {item.avgMs}мс
                        </span>
                      </div>
                      <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>Слабые сочетания</h5>
                <span>Ошибки перехода и потеря темпа</span>
              </div>
              {weakestBigrams.length === 0 ? (
                <p className="smart-stats-empty">Недостаточно данных по биграммам.</p>
              ) : (
                <div className="smart-stats-list">
                  {weakestBigrams.map(item => (
                    <div key={item.bigram} className="smart-stat-row">
                      <div className="smart-stat-main">
                        <span className="smart-stat-token mono">{item.bigram.toUpperCase()}</span>
                        <span className="smart-stat-reason">
                          {item.errorRate}% сбоев · {item.avgMs}мс
                        </span>
                      </div>
                      <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>Пальцы и ряды</h5>
                <span>Где копится нагрузка</span>
              </div>
              <div className="smart-stats-dual">
                <div>
                  <span className="smart-stats-subtitle">Пальцы</span>
                  {weakestFingers.length === 0 ? (
                    <p className="smart-stats-empty">Пока без явного перекоса.</p>
                  ) : (
                    <div className="smart-stats-list compact">
                      {weakestFingers.map(item => (
                        <div key={item.finger} className="smart-stat-row">
                          <div className="smart-stat-main">
                            <span className="smart-stat-token">{FINGER_LABELS[item.finger]}</span>
                            <span className="smart-stat-reason">
                              {item.errorRate}% ошибок · {item.avgMs}мс
                            </span>
                          </div>
                          <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span className="smart-stats-subtitle">Ряды</span>
                  {rowInsights.length === 0 ? (
                    <p className="smart-stats-empty">Ряды пока выровнены.</p>
                  ) : (
                    <div className="smart-stats-list compact">
                      {rowInsights.map(item => (
                        <div key={item.row} className="smart-stat-row">
                          <div className="smart-stat-main">
                            <span className="smart-stat-token">{ROW_LABELS[item.row]}</span>
                            <span className="smart-stat-reason">
                              {item.errorRate}% ошибок · {item.avgMs}мс
                            </span>
                          </div>
                          <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>Ритм печати</h5>
                <span>Насколько ровно держится темп</span>
              </div>
              {!rhythmInsight ? (
                <p className="smart-stats-empty">Пока недостаточно интервалов для оценки ритма.</p>
              ) : (
                <div className="smart-rhythm-card">
                  <div className="smart-rhythm-score">
                    <b>{Math.round(rhythmInsight.score)}%</b>
                    <span>оценка ритма</span>
                  </div>
                  <div className="smart-rhythm-meta">
                    <span>Средний интервал: {rhythmInsight.avgInterval}мс</span>
                    <span>Среднее отклонение: {rhythmInsight.avgDeviation}мс</span>
                    <span>Сэмплов: {rhythmInsight.samples}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
