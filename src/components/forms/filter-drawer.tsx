"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";

export interface FilterDrawerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  triggerLabel?: string;
}

/**
 * Mobile-first filter container. Renders a bottom-sheet on all viewports
 * to keep the pattern consistent and give more room to complex filters
 * without dense filter bars.
 */
export function FilterDrawer({
  title,
  description,
  children,
  onReset,
  onApply,
  triggerLabel,
}: FilterDrawerProps) {
  const t = useT();
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter aria-hidden className="size-4" />
          {triggerLabel ?? t("common.filter")}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title ?? t("common.filter")}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">{children}</div>
        <DrawerFooter>
          <div className="flex gap-2">
            {onReset ? (
              <Button variant="outline" onClick={onReset} className="flex-1">
                {t("common.cancel")}
              </Button>
            ) : null}
            <Button onClick={onApply} className="flex-1">
              {t("common.confirm")}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
