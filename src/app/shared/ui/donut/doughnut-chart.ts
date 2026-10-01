import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js';

/**
 * Seuls les éléments nécessaires à un donut sont importés : ce module est chargé à la
 * demande par `Donut`, et le tree-shaking écarte le reste de Chart.js.
 */
Chart.register(DoughnutController, ArcElement, Tooltip);
Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';

export { Chart };
