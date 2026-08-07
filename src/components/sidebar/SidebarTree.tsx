import { useRef } from "react";
import { useSidebarTree } from "../../hooks/useSidebarTree";

export function SidebarTree() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useSidebarTree(fieldRef, canvasRef);
  return <div className="sidebar-tree-field" ref={fieldRef} aria-hidden="true"><canvas className="sidebar-tree-canvas" ref={canvasRef} /></div>;
}
