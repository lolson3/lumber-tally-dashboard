import type { RefObject } from "react";
import { createPortal } from "react-dom";
import type { BoardShape } from "../../utils/dashboardData";
import { numberFormatter } from "../../utils/formatting";

interface Props { shape: BoardShape; position: { x: number; y: number }; tooltipRef: RefObject<HTMLDivElement | null> }

export function BoardShapeTooltip({ shape, position, tooltipRef }: Props) {
  return createPortal(<div className="board-shape-tooltip board-shape-tooltip-portal" ref={tooltipRef} role="tooltip" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
    <strong>{numberFormatter.format(shape.width)} in × {numberFormatter.format(shape.lengthFt)} ft</strong>
    {shape.breakdown.map((item) => <div key={`${item.thickness}-${item.grade}`}><span>{item.thickness} in · Grade {item.grade.replace(/^#/, "")}</span><span>{numberFormatter.format(item.pieces)} pieces · {numberFormatter.format(item.boardFeet)} bd ft</span></div>)}
  </div>, document.body);
}
