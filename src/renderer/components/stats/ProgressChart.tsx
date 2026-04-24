import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { getChartThemeColors } from './chartTheme';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';

type ProgressChartProps = {
  title: string;
  values: number[];
  timestamps: string[];
  color: string;
  emptyText: string;
  valueLabel: string;
  minValue?: number;
  maxValue?: number;
};

export function ProgressChart({
  title,
  values,
  timestamps,
  color,
  emptyText,
  valueLabel,
  minValue,
  maxValue,
}: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
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
        const { gridColor, tickColor } = getChartThemeColors();
        Chart.getChart(canvas)?.destroy();
        chartRef.current?.destroy();

        chartRef.current = new Chart(canvas, {
          type: 'line',
          data: {
            labels: values.map((_, index) => index + 1),
            datasets: [{
              label: valueLabel,
              data: values,
              borderColor: color,
              backgroundColor: color,
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
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items) => {
                    const index = items[0]?.dataIndex ?? 0;
                    return timestamps[index] ?? '';
                  },
                },
              },
            },
            scales: {
              y: {
                min: minValue,
                max: maxValue,
                beginAtZero: minValue == null,
                ticks: { color: tickColor },
                grid: { color: gridColor },
              },
              x: {
                ticks: { color: tickColor },
                grid: { color: gridColor },
              },
            },
          },
        });
      } catch (error) {
        console.error(`Failed to initialize chart: ${title}`, error);
      }
    };

    frameId = window.requestAnimationFrame(initChart);

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      chartRef.current?.destroy();
      chartRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) Chart.getChart(canvas)?.destroy();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.data.labels = values.map((_, index) => index + 1);
      chart.data.datasets[0].label = valueLabel;
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].borderColor = color;
      chart.data.datasets[0].backgroundColor = color;
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.callbacks = {
          ...chart.options.plugins.tooltip.callbacks,
          title: (items) => {
            const index = items[0]?.dataIndex ?? 0;
            return timestamps[index] ?? '';
          },
        };
      }
      const yScale = chart.options.scales?.y as
        | { min?: number; max?: number; beginAtZero?: boolean }
        | undefined;
      if (yScale && !Array.isArray(yScale)) {
        yScale.min = minValue;
        yScale.max = maxValue;
        yScale.beginAtZero = minValue == null;
      }
      chart.update('none');
    } catch (error) {
      console.error(`Failed to update chart: ${title}`, error);
    }
  }, [color, maxValue, minValue, timestamps, title, valueLabel, values]);

  return (
    <div className="card-like stats-chart-card">
      <h4>{title}</h4>
      <div className="stats-chart-wrap">
        {values.length === 0 ? (
          <EmptyStateNotice className="smart-stats-empty" text={emptyText} />
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}
