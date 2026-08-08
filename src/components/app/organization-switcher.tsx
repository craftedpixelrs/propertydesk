"use client";

import { useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { authClient, useActiveOrganization, useListOrganizations } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher({ className }: { className?: string }) {
  const { data: organizations } = useListOrganizations();
  const { data: active } = useActiveOrganization();
  const [busy, setBusy] = useState(false);

  const list = organizations ?? [];
  const activeName = active?.name ?? t("organization.noOrgTitle");

  async function handleSelect(id: string) {
    if (busy || id === active?.id) return;
    setBusy(true);
    try {
      await authClient.organization.setActive({ organizationId: id });
      if (typeof window !== "undefined") window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 min-w-0 max-w-full justify-between", className)}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Building2 aria-hidden className="size-4 text-[var(--color-foreground-muted)]" />
            <span className="truncate text-left">{activeName}</span>
          </span>
          <ChevronDown aria-hidden className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("organization.switcherLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.length === 0 ? (
          <div className="px-2 py-2 text-sm text-[var(--color-foreground-muted)]">
            {t("empty.noItemsYet")}
          </div>
        ) : (
          list.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={(e) => {
                e.preventDefault();
                void handleSelect(org.id);
              }}
              className="justify-between"
            >
              <span className="truncate">{org.name}</span>
              {active?.id === org.id ? <Check className="size-4" aria-hidden /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
