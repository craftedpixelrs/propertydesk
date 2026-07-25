import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
      >
        <AlertTriangle className="size-6" />
      </div>
      <div className="max-w-md">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {title ?? t("errors.generic")}
        </h3>
        {description ? (
          <p className="text-sm text-[var(--color-foreground-muted)] mt-1">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {t("common.next")}
        </Button>
      ) : null}
    </Card>
  );
}
