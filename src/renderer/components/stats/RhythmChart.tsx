import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { getChartThemeColors } from './chartTheme';

type RhythmChartProps = {
  title?: string;
  labels: number[];
  data: number[];
  averageLine: number[];
  emptyText?: string;
};

export function RhythmChart({
  title,
  labels,
  data,
  averageLine,
  emptyText = 'Недостаточно данных для графика.',
}: RhythmChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!data.length) {
      chartRef.current?.destroy();
      chartRef.current = null;
      setError(false);
      return;
    }

    const { accent, subtext, gridColor, tickColor } = getChartThemeColors();
    let frameId = 0;
    let cancelled = false;

    const initChart = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas || !canvas.isConnected || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        frameId = window.requestAnimationFrame(initChart);
        return;
      }

      try {
        Chart.getChart(canvas)?.destroy();
        chartRef.current?.destroy();
        chartRef.current = new Chart(canvas, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Интервал',
                data,
                borderColor: accent,
                backgroundColor: accent,
                tension: 0.24,
                fill: false,
                pointRadius: 1.8,
                pointHoverRadius: 3,
                borderWidth: 2,
              },
              {
                label: 'Средний интервал',
                data: averageLine,
                borderColor: subtext,
                backgroundColor: subtext,
                borderDash: [6, 6],
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0,
                borderWidth: 1.5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
              x: { ticks: { color: tickColor, maxTicksLimit: 16 }, grid: { color: gridColor } },
            },
          },
        });
        setError(false);
      } catch (err) {
        console.error(`Failed to initialize rhythm chart${title ? `: ${title}` : ''}`, err);
        chartRef.current?.destroy();
        chartRef.current = null;
        setError(true);
      }
    };

    frameId = window.requestAnimationFrame(initChart);

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [averageLine, data, labels, title]);

  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = data;
      chartRef.current.data.datasets[1].data = averageLine;
      chartRef.current.update('none');
    } catch (err) {
      console.error(`Failed to update rhythm chart${title ? `: ${title}` : ''}`, err);
      chartRef.current?.destroy();
      chartRef.current = null;
      setError(true);
    }
  }, [averageLine, data, labels, title]);

  return (
    <div className="stats-chart-wrap rhythm">
      {!data.length ? (
        <p className="smart-stats-empty">{emptyText}</p>
      ) : error ? (
        <p style={{ opacity: 0.6 }}>График ритма временно недоступен. Остальная статистика сохранена.</p>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
