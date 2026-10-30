"use client";

import { useState } from "react";
import type { BuildingNoticeAudience, BuildingNoticeChannel } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const CHANNELS: BuildingNoticeChannel[] = ["PORTAL_ONLY", "PORTAL_AND_EMAIL", "EMAIL_ONLY"];
const AUDIENCES: BuildingNoticeAudience[] = [
  "ALL",
  "BY_ENTRANCE",
  "BY_UNIT_TYPE",
  "SPECIFIC_UNITS",
];

export function NewNoticeDialog({
  buildings,
  defaultBuildingId,
}: {
  buildings: Array<{ id: string; name: string }>;
  defaultBuildingId?: string;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState(defaultBuildingId ?? buildings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<BuildingNoticeChannel>("PORTAL_AND_EMAIL");
  const [audience, setAudience] = useState<BuildingNoticeAudience>("ALL");
  const [publishNow, setPublishNow] = useState(true);
  return (
    <ActionDialog
      trigger={<Button>{t("manager.notices.newButton")}</Button>}
      title={t("manager.notices.newButton")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post("/manager/notices", {
          buildingId,
          title: title.trim(),
          body: body.trim(),
          channel,
          audience,
          publishNow,
        });
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.notices.columns.building")}
            id="nn-building"
            value={buildingId}
            options={buildings.map((b) => ({ value: b.id, label: b.name }))}
            onChange={(v) => v && setBuildingId(v)}
          />
          <Field
            label={t("manager.notices.titleField")}
            id="nn-title"
            value={title}
            required
            onChange={setTitle}
          />
          <TextareaField
            label={t("manager.notices.bodyField")}
            id="nn-body"
            value={body}
            required
            rows={6}
            onChange={setBody}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.notices.channelField")}
              id="nn-ch"
              value={channel}
              options={CHANNELS.map((c) => ({
                value: c,
                label: t(`manager.notices.channels.${c}` as const),
              }))}
              onChange={(v) => v && setChannel(v)}
            />
            <SelectField
              label={t("manager.notices.audienceField")}
              id="nn-aud"
              value={audience}
              options={AUDIENCES.map((a) => ({
                value: a,
                label: t(`manager.notices.audiences.${a}` as const),
              }))}
              onChange={(v) => v && setAudience(v)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.currentTarget.checked)}
            />
            <span>{t("manager.notices.publishNow")}</span>
          </label>
        </>
      )}
    </ActionDialog>
  );
}

export function PublishNoticeButton({ noticeId }: { noticeId: string }) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          {t("manager.notices.publishAction")}
        </Button>
      }
      title={t("manager.notices.publishAction")}
      submitLabel={t("manager.notices.publishAction")}
      onSubmit={async () => {
        await apiClient.post(`/manager/notices/${noticeId}/publish`);
      }}
    >
      {() => <p className="text-sm">{t("manager.notices.publishNow")}?</p>}
    </ActionDialog>
  );
}
