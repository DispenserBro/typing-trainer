import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FingerName, PracticeBigramInsight, PracticeInsightAggregate } from '../../../shared/types';
import { FINGER_LABELS, ROW_LABELS } from '../../../core/stats/utils';

type WeakChar = {
  char: string;
  entry: PracticeInsightAggregate;
  attempts: number;
  avgMs: number;
  errorRate: number;
};

type WeakBigram = {
  bigram: string;
  entry: PracticeBigramInsight;
  attempts: number;
  avgMs: number;
  errorRate: number;
};

type WeakFinger = {
  finger: FingerName;
  entry: PracticeInsightAggregate;
  attempts: number;
  avgMs: number;
  errorRate: number;
};

type WeakRow = {
  row: keyof typeof ROW_LABELS;
  entry: PracticeInsightAggregate;
  attempts: number;
  avgMs: number;
  errorRate: number;
};

type RhythmInsightSummary = {
  score: number;
  avgInterval: number;
  avgDeviation: number;
  samples: number;
} | null;

type StatsInsightsSectionProps = {
  expanded: boolean;
  onToggle: () => void;
  hasInsights: boolean;
  weakestChars: WeakChar[];
  weakestBigrams: WeakBigram[];
  weakestFingers: WeakFinger[];
  rowInsights: WeakRow[];
  rhythmInsight: RhythmInsightSummary;
};

export function StatsInsightsSection({
  expanded,
  onToggle,
  hasInsights,
  weakestChars,
  weakestBigrams,
  weakestFingers,
  rowInsights,
  rhythmInsight,
}: StatsInsightsSectionProps) {
  return (
    <div className="card stats-section-card mt-16">
      <button
        type="button"
        className={`stats-section-toggle${expanded ? ' expanded' : ''}`}
        onClick={onToggle}
      >
        <div>
          <h4>Аналитика умной практики</h4>
          <p className="card-desc">
            Здесь видно, почему система считает конкретные буквы, сочетания и зоны клавиатуры слабыми.
          </p>
        </div>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {expanded && (
        <>
          {!hasInsights ? (
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
        </>
      )}
    </div>
  );
}

