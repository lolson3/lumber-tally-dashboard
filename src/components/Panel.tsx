import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  titleAction?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, children, action, titleAction, className = "" }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <div className="panel-title-row">
            <h2>{title}</h2>
            {titleAction}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
