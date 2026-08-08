import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  rows?: number;
  className?: string;
}

export function LoadingState({ rows = 3, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
        className,
      )}
      aria-busy
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return <Skeleton className={cn("h-24 w-full", className)} />;
}
