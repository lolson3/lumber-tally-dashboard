import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { positionTooltipAtCursor } from "../../utils/tooltipPosition";

interface Props {
  children: ReactNode;
  pointer: { x: number; y: number };
}

export function FloatingTooltipPortal({ children, pointer }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  useEffect(() => positionTooltipAtCursor(tooltipRef.current, pointer.x, pointer.y), [pointer]);
  return createPortal(
    <div className="recharts-tooltip-wrapper floating-chart-tooltip" ref={tooltipRef} role="tooltip">{children}</div>,
    document.body,
  );
}
