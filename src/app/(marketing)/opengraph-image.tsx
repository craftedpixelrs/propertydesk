import { ImageResponse } from "next/og";

/**
 * Branded OG image (1200×630) served at `/opengraph-image` for the
 * marketing landing. Rendered on-demand at the edge - no bundled asset.
 */
export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt =
  "PropertyDesk - operativni sistem za prodaju novogradnje";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #dbeafe 100%)",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 20 }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 16,
              background: "#1e40af",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: -1,
            }}
          >
            PropertyDesk
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            Operativni sistem za prodaju novogradnje
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#334155",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            Projekti, kupci, rezervacije, uplate i provizije agencija - sve na
            srpskom, sa IPS QR i SEF integracijom.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#475569",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#dcfce7",
                color: "#166534",
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              Lansiranje 01.09.2026 · −50% prva 3 meseca
            </div>
          </div>
          <div style={{ fontWeight: 500 }}>propertydesk.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
