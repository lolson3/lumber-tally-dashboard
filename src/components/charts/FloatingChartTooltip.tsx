import { useEffect, useRef, useState, type ComponentProps } from "react";
import { DefaultTooltipContent, Tooltip, type TooltipContentProps, type TooltipValueType } from "recharts";
import { FloatingTooltipPortal } from "./FloatingTooltipPortal";

type Props = ComponentProps<typeof Tooltip>;

function FloatingContent(props: TooltipContentProps<TooltipValueType, string | number> & { pointer: { x: number; y: number } }) {
  if (!props.active) return null;
  return <FloatingTooltipPortal pointer={props.pointer}><DefaultTooltipContent {...props} /></FloatingTooltipPortal>;
}

export function FloatingChartTooltip(props: Props) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [dismissed, setDismissed] = useState(false);
  const touchInteraction = useRef(false);
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      const insideChart = Boolean((event.target as Element | null)?.closest(".recharts-wrapper"));
      if (event.pointerType === "touch") {
        touchInteraction.current = true;
        if (insideChart) {
          setPointer({ x: event.clientX, y: event.clientY });
          setDismissed(false);
        } else {
          setDismissed(true);
        }
        return;
      }
      touchInteraction.current = false;
      setDismissed(!insideChart);
      if (insideChart) setPointer({ x: event.clientX, y: event.clientY });
    };
    const dismissTooltip = () => setDismissed(true);
    const beginTouchScroll = () => { touchInteraction.current = true; dismissTooltip(); };
    const dismissOnKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismissTooltip(); };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("pointerdown", trackPointer, { passive: true, capture: true });
    window.addEventListener("scroll", dismissTooltip, { passive: true, capture: true });
    window.addEventListener("blur", dismissTooltip);
    document.documentElement.addEventListener("pointerleave", dismissTooltip);
    window.addEventListener("touchmove", beginTouchScroll, { passive: true, capture: true });
    window.addEventListener("keydown", dismissOnKey);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("pointerdown", trackPointer, { capture: true });
      window.removeEventListener("scroll", dismissTooltip, { capture: true });
      window.removeEventListener("blur", dismissTooltip);
      document.documentElement.removeEventListener("pointerleave", dismissTooltip);
      window.removeEventListener("touchmove", beginTouchScroll, { capture: true });
      window.removeEventListener("keydown", dismissOnKey);
    };
  }, []);
  return <Tooltip
    {...props}
    isAnimationActive={false}
    cursor={false}
    content={(contentProps) => dismissed ? null : <FloatingContent {...contentProps} pointer={pointer} />}
  />;
}
