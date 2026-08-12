import { DefaultTooltipContent, type TooltipPayloadEntry } from "recharts";
import { FloatingTooltipPortal } from "../charts/FloatingTooltipPortal";
import type { BoardShape } from "../../utils/dashboardData";
import { numberFormatter } from "../../utils/formatting";

interface Props { shape: BoardShape; pointer: { x: number; y: number } }

export function BoardShapeTooltip({ shape, pointer }: Props) {
  const payload: TooltipPayloadEntry[] = shape.breakdown.map((item) => ({
    graphicalItemId: `${item.thickness}-${item.grade}`,
    name: `${item.thickness} in · Grade ${item.grade.replace(/^#/, "")}`,
    value: `${numberFormatter.format(item.pieces)} pieces · ${numberFormatter.format(item.boardFeet)} bd ft`,
    color: "#f5a623",
  }));
  return <FloatingTooltipPortal pointer={pointer}>
    <DefaultTooltipContent label={`${numberFormatter.format(shape.width)} in × ${numberFormatter.format(shape.lengthFt)} ft`} payload={payload} />
  </FloatingTooltipPortal>;
}
