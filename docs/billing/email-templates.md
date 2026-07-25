# Email templates

The billing module ships **14 email templates** covering the subscription
and invoice lifecycles plus payment reminders. This document explains how
they are structured, how the preview and test-send flows work, and how to
add a new template key.

## Where the code lives

| Concern | File |
| --- | --- |
| Shared branded layout (`wrapBillingEmail`, helpers) | `src/server/services/billing/emails/layout.ts` |
| Template registry + rendering (`renderBillingEmail`, `TEMPLATE_LAYOUTS`, `DEFAULT_TEMPLATES`) | `src/server/services/billing/emails/templates.ts` |
| Preview service (`previewBillingEmail`, `SAMPLE_VARIABLES`) | `src/server/services/billing/emails/preview.ts` |
| Preview API | `src/app/api/v1/billing/templates/[key]/preview/route.ts` |
| Test-send API | `src/app/api/v1/billing/templates/[key]/test-send/route.ts` |
| Admin list page | `src/app/(dashboard)/administracija/naplata/sabloni/page.tsx` |
| Admin editor page | `src/app/(dashboard)/administracija/naplata/sabloni/[key]/page.tsx` |
| Editor client component | `src/features/billing/template-editor.tsx` |

## The two moving parts

Every billing email is composed from two independently versioned parts:

1. **Content (editable via admin UI)** — stored in `BillingEmailTemplate`
   rows. Three fields per template:
   - `subject`
   - `bodyText` — plain-text fallback
   - `bodyHtml` — the **intro HTML** that appears above the automatically
     generated key-value information card. This is intentionally short:
     one to three sentences of context. Operators cannot break the visual
     layout by mistake here.

2. **Structure (defined in code, not editable)** — a per-key entry in
   `TEMPLATE_LAYOUTS`. Describes the badge, title, key-value pairs to
   render inside the info card, optional callout, CTA button, and
   footer note. All string fields support the same `{{variable}}`
   placeholders as the DB content.

When `renderBillingEmail(key, vars)` is called (either by the real
send-path via `notify()` or by the admin preview) both parts are
substituted with the supplied variables and fed into `wrapBillingEmail`,
which produces the full `<!doctype html>` document with the branded
shell.

### Escape hatch

A template whose `bodyHtml` starts with `<!doctype` or `<html` bypasses
the wrapper entirely and is used as-is. This is the escape hatch for
manually-authored one-off HTML. In practice we don't use it — but it
exists so the migration to the branded shell is backward-compatible.

## Preview

`GET /administracija/naplata/sabloni/[key]` renders the editor page. As
the operator types, the client component (`template-editor.tsx`) posts
the current draft to:

```
POST /api/v1/billing/templates/{key}/preview
Body: { variables?: Record<string,string>, draft?: { subject?, bodyText?, bodyHtml? } }
Response: { subject, html, text, variables }
```

The request is debounced (`useDeferredValue` + a 250 ms tail) so
typing bursts don't spam the network. Race conditions between out-of-
order responses are guarded by a `requestIdRef` counter.

The preview iframe uses `sandbox="allow-same-origin"` (no scripts) —
even if a template accidentally contained a `<script>` tag the browser
would not execute it inside the preview.

Sample data per key lives in `SAMPLE_VARIABLES` (`preview.ts`). Add a
matching entry there whenever you add a new template key.

## Test send

The editor exposes a "send test message" button that posts to:

```
POST /api/v1/billing/templates/{key}/test-send
Body: { to?: string, variables?: Record<string,string>, draft?: {...} }
```

When `to` is omitted the recipient defaults to the signed-in
super-admin's email address. The subject line is prefixed with `[TEST]`
so it's obvious in the recipient's inbox. Delivery uses
`sendEmail(...)` directly — the standard `notify(...)` path is NOT
used because a test send must never produce an in-app notification for
the recipient.

Every test send emits a `billing.email_template_test_sent` audit row
with the recipient and rendered subject line.

## Adding a new template key

1. Extend `BillingTemplateKey` in `templates.ts` and add:
   - a `TEMPLATE_LAYOUTS[<new-key>]` entry with the structural parts;
   - a `DEFAULT_TEMPLATES` entry with the editable content (`subject`,
     `bodyText`, `bodyHtml`, `variables`).
2. Add a `SAMPLE_VARIABLES[<new-key>]` entry in `preview.ts` covering
   every placeholder the template references.
3. Run `seedDefaultBillingTemplates()` (or just open the admin list
   page — it seeds on load).
4. Wire it into a business event: `notify(orgId, {...}, sendEmail: true,
   emailKey: "<new-key>", emailVariables: {...})`.

## Audit actions

| Action | Emitted from |
| --- | --- |
| `billing.email_template_updated` | Save button on the editor page. |
| `billing.email_template_test_sent` | "Send test message" button on the editor page. |
