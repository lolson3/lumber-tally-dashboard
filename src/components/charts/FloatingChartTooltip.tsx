import { useEffect, useState, type ComponentProps } from "react";
import { DefaultTooltipContent, Tooltip, type TooltipContentProps, type TooltipValueType } from "recharts";
import { FloatingTooltipPortal } from "./FloatingTooltipPortal";

type Props = ComponentProps<typeof Tooltip>;

function FloatingContent(props: TooltipContentProps<TooltipValueType, string | number> & { pointer: { x: number; y: number } }) {
  if (!props.active) return null;
  return <FloatingTooltipPortal pointer={props.pointer}><DefaultTooltipContent {...props} /></FloatingTooltipPortal>;
}

export function FloatingChartTooltip(props: Props) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => setPointer({ x: event.clientX, y: event.clientY });
    window.addEventListener("pointermove", trackPointer, { passive: true });
    return () => window.removeEventListener("pointermove", trackPointer);
  }, []);
  return <Tooltip
    {...props}
    isAnimationActive={false}
    cursor={false}
    content={(contentProps) => <FloatingContent {...contentProps} pointer={pointer} />}
  />;
}
