import type { ReactNode } from "react";

interface QueryStateProps {
  isPending: boolean;
  error: Error | null;
  children: ReactNode;
  onRetry?: () => void;
}

export function QueryState({ isPending, error, children, onRetry }: QueryStateProps) {
  if (isPending) return <div className="loading-state" aria-live="polite">Loading data…</div>;
  if (error) {
    return (
      <div className="error-state" role="alert">
        <strong>Unable to load this section.</strong>
        <span>{error.message}</span>
        {onRetry && <button className="secondary-button retry-button" type="button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  return children;
}
