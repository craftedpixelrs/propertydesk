"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

/**
 * Client-side editor for a single billing email template.
 *
 * The layout is intentionally two-column on the desktop:
 *   - Left  : the editable form (subject, plain text body, HTML body,
 *             active toggle, chip list of available variables).
 *   - Right : a live preview card with a Desktop/Mobile viewport toggle,
 *             the rendered subject line, an iframe showing the composed
 *             HTML, and a "send test email" button.
 *
 * The preview is intentionally rendered server-side: as the operator
 * types we POST the current draft to `/billing/templates/{key}/preview`
 * (debounced with `useDeferredValue` + a short debounce). This keeps
 * the preview 100 % faithful to what the customer will actually
 * receive — the composition pipeline lives on the server and is not
 * duplicated in the browser.
 */

interface Props {
  templateKey: string;
  templateName: string;
  description: string | null;
  initialSubject: string;
  initialBodyText: string;
  initialBodyHtml: string;
  initialActive: boolean;
  variables: string[];
  initialUserEmail: string | null;
  saveAction: (formData: FormData) => Promise<void>;
}

type Viewport = "desktop" | "mobile";

export function TemplateEditor(props: Props) {
  const router = useRouter();
  const t = useT();

  const [subject, setSubject] = useState(props.initialSubject);
  const [bodyText, setBodyText] = useState(props.initialBodyText);
  const [bodyHtml, setBodyHtml] = useState(props.initialBodyHtml);
  const [active, setActive] = useState(props.initialActive);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [showPlain, setShowPlain] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewText, setPreviewText] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testTo, setTestTo] = useState<string>(props.initialUserEmail ?? "");
  const [testStatus, setTestStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; to: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const [isSaving, startSave] = useTransition();

  // -----------------------------------------------------------------------
  // Live preview: debounced fetch driven by useDeferredValue
  // -----------------------------------------------------------------------

  const deferredSubject = useDeferredValue(subject);
  const deferredBodyText = useDeferredValue(bodyText);
  const deferredBodyHtml = useDeferredValue(bodyHtml);

  // Track the currently-pending request so a slower response can't
  // overwrite a fresher one (race avoidance).
  const requestIdRef = useRef(0);

  const fetchPreview = useCallback(
    async (draftSubject: string, draftText: string, draftHtml: string) => {
      const myRequestId = ++requestIdRef.current;
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await apiClient.post<{
          subject: string;
          html: string;
          text: string;
        }>(`/billing/templates/${encodeURIComponent(props.templateKey)}/preview`, {
          draft: {
            subject: draftSubject,
            bodyText: draftText,
            bodyHtml: draftHtml,
          },
        });
        if (myRequestId !== requestIdRef.current) return;
        setPreviewSubject(res.subject);
        setPreviewHtml(res.html);
        setPreviewText(res.text);
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return;
        setPreviewError(
          err instanceof ApiClientError
            ? err.message
            : t("admin.templates.previewFailed"),
        );
      } finally {
        if (myRequestId === requestIdRef.current) {
          setPreviewLoading(false);
        }
      }
    },
    [props.templateKey, t],
  );

  useEffect(() => {
    // Trigger a preview fetch on mount + every time any deferred value
    // changes. `useDeferredValue` already batches typing bursts, but we
    // still add a 250 ms tail so the network isn't spammed.
    const handle = setTimeout(() => {
      void fetchPreview(deferredSubject, deferredBodyText, deferredBodyHtml);
    }, 250);
    return () => clearTimeout(handle);
  }, [deferredSubject, deferredBodyText, deferredBodyHtml, fetchPreview]);

  // -----------------------------------------------------------------------
  // Variable chip insertion — insert `{{name}}` at the current cursor
  // position inside the HTML textarea (falls back to append).
  // -----------------------------------------------------------------------

  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertVariable = useCallback((name: string) => {
    const token = `{{${name}}}`;
    const ta = htmlTextareaRef.current;
    if (!ta) {
      setBodyHtml((prev) => prev + token);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = ta.value.slice(0, start) + token + ta.value.slice(end);
    setBodyHtml(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + token.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }, []);

  // -----------------------------------------------------------------------
  // Test send
  // -----------------------------------------------------------------------

  const onSendTest = useCallback(async () => {
    const recipient = testTo.trim();
    if (!recipient) {
      setTestStatus({ kind: "error", message: t("admin.templates.enterEmail") });
      return;
    }
    setTestStatus({ kind: "sending" });
    try {
      await apiClient.post<{ sent: boolean; to: string }>(
        `/billing/templates/${encodeURIComponent(
          props.templateKey,
        )}/test-send`,
        {
          to: recipient,
          draft: { subject, bodyText, bodyHtml },
        },
      );
      setTestStatus({ kind: "sent", to: recipient });
    } catch (err) {
      setTestStatus({
        kind: "error",
        message:
          err instanceof ApiClientError
            ? err.message
            : t("admin.templates.testFailed"),
      });
    }
  }, [testTo, subject, bodyText, bodyHtml, props.templateKey, t]);

  // -----------------------------------------------------------------------
  // Save (via server action passed from the page)
  // -----------------------------------------------------------------------

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData();
      fd.set("subject", subject);
      fd.set("bodyText", bodyText);
      fd.set("bodyHtml", bodyHtml);
      if (active) fd.set("active", "on");
      startSave(async () => {
        await props.saveAction(fd);
        router.refresh();
      });
    },
    [subject, bodyText, bodyHtml, active, props, router],
  );

  // Reset "sent" indicator when the user starts typing a new recipient
  // so a stale success message doesn't linger.
  const onTestToChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTestTo(e.target.value);
    if (testStatus.kind !== "idle") setTestStatus({ kind: "idle" });
  };

  const iframeWidth = viewport === "mobile" ? 375 : 640;

  const groupedVars = useMemo(() => props.variables, [props.variables]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* --------------------------- LEFT: FORM --------------------------- */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("admin.templates.content")}</h3>

          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.templates.subject")}
              </span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={500}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.templates.htmlIntro")}
              </span>
              <textarea
                ref={htmlTextareaRef}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-xs"
              />
              <span className="text-[11px] text-[var(--color-foreground-subtle)]">
                {t("admin.templates.htmlHint")}
              </span>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.templates.plainText")}
              </span>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-xs"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4"
              />
              <span>{t("admin.templates.templateActive")}</span>
              <span className="text-[11px] text-[var(--color-foreground-subtle)]">
                {t("admin.templates.templateActiveHint")}
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {t("admin.templates.variables")}
          </h3>
          <p className="mb-3 text-xs text-[var(--color-foreground-muted)]">
            {t("admin.templates.variablesHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            {groupedVars.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-[11px] text-[var(--color-foreground)] transition hover:border-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)]"
              >
                {"{{" + v + "}}"}
              </button>
            ))}
            {groupedVars.length === 0 ? (
              <span className="text-xs text-[var(--color-foreground-subtle)]">
                {t("admin.templates.noVariables")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" loading={isSaving}>
            {t("admin.templates.saveTemplate")}
          </Button>
        </div>
      </form>

      {/* --------------------------- RIGHT: PREVIEW --------------------------- */}
      <div className="space-y-4">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Preview toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                {t("admin.templates.preview")}
              </span>
              {previewLoading ? (
                <span className="text-[11px] text-[var(--color-foreground-subtle)]">
                  {t("admin.templates.refreshing")}
                </span>
              ) : null}
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-border)] text-xs">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={
                  "px-3 py-1 " +
                  (viewport === "desktop"
                    ? "bg-[var(--color-brand-600)] text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)]")
                }
              >
                {t("admin.templates.desktop")}
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={
                  "border-l border-[var(--color-border)] px-3 py-1 " +
                  (viewport === "mobile"
                    ? "bg-[var(--color-brand-600)] text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)]")
                }
              >
                {t("admin.templates.mobile")}
              </button>
            </div>
          </div>

          {/* Subject preview strip */}
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-foreground-subtle)]">
              {t("admin.templates.inboxSubject")}
            </div>
            <div className="mt-0.5 font-medium text-[var(--color-foreground)]">
              {previewSubject || t("admin.dash")}
            </div>
          </div>

          {/* Iframe */}
          <div className="flex justify-center bg-[var(--color-surface-muted)] p-4">
            {previewError ? (
              <div className="w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {previewError}
              </div>
            ) : (
              <iframe
                title={t("admin.templates.iframeTitle")}
                srcDoc={previewHtml}
                sandbox="allow-same-origin"
                style={{
                  width: iframeWidth,
                  maxWidth: "100%",
                  height: 640,
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  background: "white",
                }}
              />
            )}
          </div>

          {/* Plain-text collapsible */}
          <div className="border-t border-[var(--color-border)] p-3">
            <button
              type="button"
              onClick={() => setShowPlain((s) => !s)}
              className="text-xs font-medium text-[var(--color-brand-700)] hover:underline"
            >
              {showPlain ? t("admin.templates.hidePlain") : t("admin.templates.showPlain")}
            </button>
            {showPlain ? (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 font-mono text-[11px] text-[var(--color-foreground)]">
                {previewText || t("admin.dash")}
              </pre>
            ) : null}
          </div>
        </div>

        {/* Test send */}
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("admin.templates.sendTest")}</h3>
          <p className="mb-3 text-xs text-[var(--color-foreground-muted)]">
            {t("admin.templates.sendTestHint")}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.templates.emailAddress")}
              </span>
              <Input
                type="email"
                value={testTo}
                onChange={onTestToChange}
                placeholder={t("admin.templates.emailPlaceholder")}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={onSendTest}
              loading={testStatus.kind === "sending"}
            >
              {t("admin.templates.sendTestBtn")}
            </Button>
          </div>
          {testStatus.kind === "sent" ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              {t("admin.testSentTo", { to: testStatus.to })}
            </div>
          ) : null}
          {testStatus.kind === "error" ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {testStatus.message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
