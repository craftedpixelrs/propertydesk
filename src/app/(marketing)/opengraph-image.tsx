import { ImageResponse } from "next/og";
import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, t } from "@/lib/i18n";

/**
 * Branded OG image (1200×630) served at `/opengraph-image` for the
 * marketing landing. Rendered on-demand at the edge - no bundled asset.
 */
export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = t("marketing.landing.ogAlt");

export default async function OgImage() {
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;

  // Stock matrix drawn on the right: free, reserved, sold. Same motif
  // as the site, so a shared link looks like the page it opens.
  const matrix = [
    [1, 1, 3, 3, 2, 1],
    [3, 1, 1, 3, 3, 2],
    [3, 3, 2, 1, 3, 3],
    [1, 3, 3, 3, 1, 3],
    [3, 2, 3, 1, 3, 3],
  ];
  const cell = ["transparent", "#5fd2d8", "#fbbf24", "rgba(255,255,255,0.22)"];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#0a1b3d",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -260,
          right: -200,
          width: 820,
          height: 820,
          borderRadius: 9999,
          background: "radial-gradient(closest-side, rgba(95,210,216,0.34), rgba(95,210,216,0))",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          width: 800,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#5fd2d8",
              color: "#0a1b3d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>PropertyDesk</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2,
            }}
          >
            {t("marketing.landing.ogHeadline", undefined, locale)}
          </div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>
            {t("marketing.landing.ogSub", undefined, locale)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 21 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid rgba(95,210,216,0.5)",
              color: "#5fd2d8",
              padding: "9px 16px",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            {t("marketing.landing.ogBadge", undefined, locale)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>propertydesk.app</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          paddingRight: 72,
          flex: 1,
        }}
      >
        {matrix.map((row, r) => (
          <div key={r} style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {row.map((v, c) => (
              <div
                key={c}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: cell[v],
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
