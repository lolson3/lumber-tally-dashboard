export function tooltipCoordinates(
  clientX: number,
  clientY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const gap = 14;
  const inset = 8;
  let x = clientX + gap;
  let y = clientY + gap;
  if (x + tooltipWidth > viewportWidth - inset) x = clientX - tooltipWidth - gap;
  if (y + tooltipHeight > viewportHeight - inset) y = clientY - tooltipHeight - gap;
  return {
    x: Math.max(inset, Math.min(x, viewportWidth - tooltipWidth - inset)),
    y: Math.max(inset, Math.min(y, viewportHeight - tooltipHeight - inset)),
  };
}

export function positionTooltipAtCursor(
  tooltip: HTMLElement | null,
  clientX: number,
  clientY: number,
  origin = { left: 0, top: 0 },
) {
  if (!tooltip) return;
  const bounds = tooltip.getBoundingClientRect();
  const { x, y } = tooltipCoordinates(
    clientX, clientY, bounds.width, bounds.height, window.innerWidth, window.innerHeight,
  );
  tooltip.style.transform = `translate(${x - origin.left}px, ${y - origin.top}px)`;
}

export function followChartTooltip(chart: HTMLDivElement | null, clientX: number, clientY: number) {
  if (!chart) return;
  const tooltip = chart.querySelector<HTMLElement>(".recharts-tooltip-wrapper");
  positionTooltipAtCursor(tooltip, clientX, clientY, chart.getBoundingClientRect());
  tooltip?.style.setProperty("opacity", "1", "important");
}

export function hideChartTooltip(chart: HTMLDivElement | null) {
  chart?.querySelector<HTMLElement>(".recharts-tooltip-wrapper")
    ?.style.setProperty("opacity", "0", "important");
}
