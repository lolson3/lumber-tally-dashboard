import { useMemo, useRef, useState } from "react";
import type { BoardShape } from "../../utils/dashboardData";
import { numberFormatter } from "../../utils/formatting";
import { positionTooltipAtCursor } from "../../utils/tooltipPosition";
import { BoardShapeTooltip } from "./BoardShapeTooltip";

export function BoardVisualization({ shapes }: { shapes: BoardShape[] }) {
  const [activeShape, setActiveShape] = useState<BoardShape | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [maximumWidth, maximumLength] = useMemo(() => [
    Math.max(1, ...shapes.map((shape) => shape.width)),
    Math.max(1, ...shapes.map((shape) => shape.lengthFt)),
  ], [shapes]);

  if (shapes.length === 0) return <p className="empty-state">No board dimension data was returned for these dates.</p>;
  return <>
    <div className="board-visualization" aria-label="Relative board dimensions by width and length" role="img">
      {shapes.map((shape) => <div
        className="board-shape" key={`${shape.width}-${shape.lengthFt}`} tabIndex={0}
        onPointerEnter={(event) => { setPosition({ x: event.clientX + 14, y: event.clientY + 14 }); setActiveShape(shape); window.requestAnimationFrame(() => positionTooltipAtCursor(tooltipRef.current, event.clientX, event.clientY)); }}
        onPointerMove={(event) => positionTooltipAtCursor(tooltipRef.current, event.clientX, event.clientY)}
        onPointerLeave={() => setActiveShape(null)}
        onFocus={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setPosition({ x: bounds.right + 14, y: bounds.top + 14 }); setActiveShape(shape); window.requestAnimationFrame(() => positionTooltipAtCursor(tooltipRef.current, bounds.right, bounds.top)); }}
        onBlur={() => setActiveShape(null)}
        style={{ width: `${44 + (shape.width / maximumWidth) * 76}px`, height: `${64 + (shape.lengthFt / maximumLength) * 126}px` }}
      ><span>{numberFormatter.format(shape.width)} × {numberFormatter.format(shape.lengthFt)}</span></div>)}
    </div>
    {activeShape && <BoardShapeTooltip shape={activeShape} position={position} tooltipRef={tooltipRef} />}
  </>;
}
