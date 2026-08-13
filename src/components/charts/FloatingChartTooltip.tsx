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
  const [touchDismissed, setTouchDismissed] = useState(false);
  const touchInteraction = useRef(false);
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        touchInteraction.current = true;
        if ((event.target as Element | null)?.closest(".recharts-wrapper")) {
          setPointer({ x: event.clientX, y: event.clientY });
          setTouchDismissed(false);
        } else {
          setTouchDismissed(true);
        }
        return;
      }
      touchInteraction.current = false;
      setPointer({ x: event.clientX, y: event.clientY });
      setTouchDismissed(false);
    };
    const dismissTouchTooltip = () => { if (touchInteraction.current) setTouchDismissed(true); };
    const beginTouchScroll = () => { touchInteraction.current = true; setTouchDismissed(true); };
    const dismissOnKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismissTouchTooltip(); };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("pointerdown", trackPointer, { passive: true, capture: true });
    window.addEventListener("scroll", dismissTouchTooltip, { passive: true, capture: true });
    window.addEventListener("touchmove", beginTouchScroll, { passive: true, capture: true });
    window.addEventListener("keydown", dismissOnKey);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("pointerdown", trackPointer, { capture: true });
      window.removeEventListener("scroll", dismissTouchTooltip, { capture: true });
      window.removeEventListener("touchmove", beginTouchScroll, { capture: true });
      window.removeEventListener("keydown", dismissOnKey);
    };
  }, []);
  return <Tooltip
    {...props}
    isAnimationActive={false}
    cursor={false}
    content={(contentProps) => touchDismissed ? null : <FloatingContent {...contentProps} pointer={pointer} />}
  />;
}
