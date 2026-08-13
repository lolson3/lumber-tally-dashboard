import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardShape } from "../../utils/dashboardData";
import { numberFormatter } from "../../utils/formatting";
import { BoardShapeTooltip } from "./BoardShapeTooltip";

export function BoardVisualization({ shapes }: { shapes: BoardShape[] }) {
  const [activeShape, setActiveShape] = useState<BoardShape | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const visualizationRef = useRef<HTMLDivElement>(null);
  const touchInteraction = useRef(false);
  const [maximumWidth, maximumLength] = useMemo(() => [
    Math.max(1, ...shapes.map((shape) => shape.width)),
    Math.max(1, ...shapes.map((shape) => shape.lengthFt)),
  ], [shapes]);

  useEffect(() => {
    const dismissTouch = () => { if (touchInteraction.current) setActiveShape(null); };
    const beginTouchScroll = () => { touchInteraction.current = true; setActiveShape(null); };
    const dismissOutside = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !visualizationRef.current?.contains(event.target as Node)) {
        touchInteraction.current = true;
        setActiveShape(null);
      }
    };
    const dismissOnKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveShape(null); };
    window.addEventListener("pointerdown", dismissOutside, { passive: true, capture: true });
    window.addEventListener("scroll", dismissTouch, { passive: true, capture: true });
    window.addEventListener("touchmove", beginTouchScroll, { passive: true, capture: true });
    window.addEventListener("keydown", dismissOnKey);
    return () => {
      window.removeEventListener("pointerdown", dismissOutside, { capture: true });
      window.removeEventListener("scroll", dismissTouch, { capture: true });
      window.removeEventListener("touchmove", beginTouchScroll, { capture: true });
      window.removeEventListener("keydown", dismissOnKey);
    };
  }, []);

  useEffect(() => setActiveShape(null), [shapes]);

  if (shapes.length === 0) return <p className="empty-state">No board dimension data was returned for these dates.</p>;
  return <>
    <div className="board-visualization" aria-label="Relative board dimensions by width and length" role="img" ref={visualizationRef}>
      {shapes.map((shape) => {
        return <div className="board-shape-item" key={`${shape.width}-${shape.lengthFt}`}>
          <span className="board-shape-percentage">{numberFormatter.format(shape.percentage)}%</span>
          <div
            className="board-shape" tabIndex={0}
            onPointerDown={(event) => {
              if (event.pointerType !== "touch") return;
              touchInteraction.current = true;
              setPointer({ x: event.clientX, y: event.clientY });
              setActiveShape((active) => active === shape ? null : shape);
            }}
            onPointerEnter={(event) => { if (event.pointerType !== "touch") { touchInteraction.current = false; setPointer({ x: event.clientX, y: event.clientY }); setActiveShape(shape); } }}
            onPointerMove={(event) => { if (event.pointerType !== "touch") setPointer({ x: event.clientX, y: event.clientY }); }}
            onPointerLeave={(event) => { if (event.pointerType !== "touch") setActiveShape(null); }}
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
