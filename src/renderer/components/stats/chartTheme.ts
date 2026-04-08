import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function getChartThemeColors() {
  const bodyStyles = getComputedStyle(document.body);
  return {
    accent: bodyStyles.getPropertyValue('--accent').trim() || '#e8751a',
    green: bodyStyles.getPropertyValue('--green').trim() || '#4caf50',
    subtext: bodyStyles.getPropertyValue('--subtext').trim() || '#8b8b8b',
    gridColor: '#2a2a2a',
    tickColor: '#666',
  };
}
