import { useEffect, type RefObject } from "react";

export function useSidebarTree(fieldRef: RefObject<HTMLDivElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    let animationFrame = 0;
    let hasDrawn = false;

    const draw = (width: number, height: number, progress: number) => {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.save();
      context.beginPath();
      context.rect(0, height * (1 - progress), width, height * progress);
      context.clip();
      context.fillStyle = "#000";
      const center = width / 2;
      const baseHalfWidth = Math.min(15, width * .08);
      context.beginPath();
      context.moveTo(center - baseHalfWidth, height);
      context.bezierCurveTo(center - 8, height * .78, center - 5, height * .32, center - 3, 4);
      context.lineTo(center + 3, 4);
      context.bezierCurveTo(center + 5, height * .32, center + 8, height * .78, center + baseHalfWidth, height);
      context.closePath();
      context.fill();
      const branchCount = Math.max(12, Math.min(36, Math.floor(height / 15)));
      for (let index = 0; index < branchCount; index += 1) {
        const level = index / Math.max(1, branchCount - 1);
        const y = 12 + level * height * .7;
        const reach = Math.min(width * .43, 12 + level * width * .34);
        const leftReach = reach * (.88 + .12 * Math.sin(index * 2.1));
        const rightReach = reach * (.88 + .12 * Math.cos(index * 1.7));
        const thickness = Math.max(3, 7 - level * 2);
        const droop = 5 + level * 10;
        context.beginPath();
        context.moveTo(center - 2, y);
        context.lineTo(center - leftReach, y + droop);
        context.lineTo(center - leftReach + 7, y + droop + thickness);
        context.lineTo(center - 1, y + thickness);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(center + 2, y + 3);
        context.lineTo(center + rightReach, y + droop + 1);
        context.lineTo(center + rightReach - 7, y + droop + thickness + 1);
        context.lineTo(center + 1, y + thickness + 3);
        context.closePath();
        context.fill();
        if (index % 2 === 0 && index < branchCount - 1) {
          const secondaryY = y + Math.max(6, height / branchCount / 2);
          const secondaryReach = reach * .68;
          context.beginPath();
          context.moveTo(center - 2, secondaryY);
          context.lineTo(center - secondaryReach, secondaryY + droop * .7);
          context.lineTo(center - secondaryReach + 6, secondaryY + droop * .7 + thickness);
          context.lineTo(center + 2, secondaryY + thickness);
          context.lineTo(center + secondaryReach * .9, secondaryY + droop * .65);
          context.lineTo(center + secondaryReach * .9 - 6, secondaryY + droop * .65 + thickness);
          context.lineTo(center + 1, secondaryY + thickness + 2);
          context.closePath();
          context.fill();
        }
      }
      context.restore();
    };

    const render = () => {
      window.cancelAnimationFrame(animationFrame);
      const bounds = field.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (hasDrawn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        draw(width, height, 1);
        hasDrawn = true;
        return;
      }
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 480);
        draw(width, height, 1 - (1 - progress) ** 3);
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
        else hasDrawn = true;
      };
      animationFrame = window.requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(render);
    observer.observe(field);
    render();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [canvasRef, fieldRef]);
}
