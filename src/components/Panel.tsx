import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, children, action, className = "" }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
