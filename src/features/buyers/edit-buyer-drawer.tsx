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
 * Edit-buyer flow in the same right-side panel as creating a buyer.
 * The detail page stays underneath.
 */
export function EditBuyerDrawer({
  children,
  buyerId,
  buyerName,
  initialValues,
}: {
  children: ReactNode;
  buyerId: string;
  buyerName: string;
  initialValues: Record<string, string>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent side="right">
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
          <div className="min-w-0 space-y-1">
            <DrawerTitle>{t("crm.buyers.editBuyer")}</DrawerTitle>
            <DrawerDescription>
              {buyerName}
              {" · "}
              {t("crm.buyers.editSubtitle")}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {open ? (
            <NewBuyerForm
              key={buyerId}
              mode="edit"
              buyerId={buyerId}
              initialValues={initialValues}
              variant="embedded"
              onCancel={() => setOpen(false)}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
