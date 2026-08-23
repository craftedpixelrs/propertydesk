"use client";

import { type ReactNode, useState } from "react";
import { X } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { NewBuyerForm } from "@/features/buyers/new-buyer-form";

/**
 * Create-buyer flow as a right-side panel. Full-screen on a phone;
 * docks to the right from `sm` so the list stays visible.
 */
export function NewBuyerDrawer({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={setOpen}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent side="right">
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
          <div className="min-w-0 space-y-1">
            <DrawerTitle>{t("crm.buyers.newBuyer")}</DrawerTitle>
            <DrawerDescription>{t("crm.buyers.newSubtitle")}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <NewBuyerForm variant="embedded" onCancel={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
