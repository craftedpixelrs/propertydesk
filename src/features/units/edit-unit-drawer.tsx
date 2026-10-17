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
import { NewUnitForm, type BuildingOpt } from "@/features/units/new-unit-form";

/** Edit a unit in a right-side panel over the unit detail. */
export function EditUnitDrawer({
  children,
  projectId,
  unitId,
  unitCode,
  structure,
  initialValues,
  expectedVersion,
}: {
  children: ReactNode;
  projectId: string;
  unitId: string;
  unitCode: string;
  structure: BuildingOpt[];
  initialValues: Record<string, string>;
  expectedVersion: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent side="right">
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
          <div className="min-w-0 space-y-1">
            <DrawerTitle>{t("inventory.units.editWithCode", { code: unitCode })}</DrawerTitle>
            <DrawerDescription>{t("inventory.units.editSubtitle")}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {open ? (
            <NewUnitForm
              key={unitId}
              projectId={projectId}
              structure={structure}
              mode="edit"
              unitId={unitId}
              initialValues={initialValues}
              expectedVersion={expectedVersion}
              variant="embedded"
              onCancel={() => setOpen(false)}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
