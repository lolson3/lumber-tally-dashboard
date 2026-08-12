import { useMemo, useState } from "react";
import type { BoardShape } from "../../utils/dashboardData";
import { numberFormatter } from "../../utils/formatting";
import { BoardShapeTooltip } from "./BoardShapeTooltip";

export function BoardVisualization({ shapes }: { shapes: BoardShape[] }) {
  const [activeShape, setActiveShape] = useState<BoardShape | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [maximumWidth, maximumLength] = useMemo(() => [
    Math.max(1, ...shapes.map((shape) => shape.width)),
    Math.max(1, ...shapes.map((shape) => shape.lengthFt)),
  ], [shapes]);

  if (shapes.length === 0) return <p className="empty-state">No board dimension data was returned for these dates.</p>;
  return <>
    <div className="board-visualization" aria-label="Relative board dimensions by width and length" role="img">
      {shapes.map((shape) => {
        return <div className="board-shape-item" key={`${shape.width}-${shape.lengthFt}`}>
          <span className="board-shape-percentage">{numberFormatter.format(shape.percentage)}%</span>
          <div
            className="board-shape" tabIndex={0}
            onPointerEnter={(event) => { setPointer({ x: event.clientX, y: event.clientY }); setActiveShape(shape); }}
            onPointerMove={(event) => setPointer({ x: event.clientX, y: event.clientY })}
            onPointerLeave={() => setActiveShape(null)}
            onFocus={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setPointer({ x: bounds.right, y: bounds.top }); setActiveShape(shape); }}
            onBlur={() => setActiveShape(null)}
            style={{ width: `${44 + (shape.width / maximumWidth) * 76}px`, height: `${64 + (shape.lengthFt / maximumLength) * 126}px` }}
          ><span>{numberFormatter.format(shape.width)} × {numberFormatter.format(shape.lengthFt)}</span></div>
        </div>;
      })}
    </div>
    {activeShape && <BoardShapeTooltip shape={activeShape} pointer={pointer} />}
  </>;
}
