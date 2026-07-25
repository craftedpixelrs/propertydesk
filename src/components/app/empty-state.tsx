import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]"
      >
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div className="max-w-md">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        {description ? (
          <p className="text-sm text-[var(--color-foreground-muted)] mt-1">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}
