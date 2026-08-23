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
import { NewProjectForm } from "@/features/projects/new-project-form";

/**
 * Create-project flow as a right-side panel. On a phone the panel is
 * full-screen so the long form and map stay usable; from `sm` it docks
 * to the right over the list.
 */
export function NewProjectDrawer({ children }: { children: ReactNode }) {
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
            <DrawerTitle>{t("projects.newProject")}</DrawerTitle>
            <DrawerDescription>{t("inventory.projects.newSubtitle")}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <NewProjectForm variant="embedded" onCancel={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
