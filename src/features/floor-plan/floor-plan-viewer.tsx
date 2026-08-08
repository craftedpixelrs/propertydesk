"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { UnitStatus } from "@prisma/client";

import type {
  FloorPlanAreaView,
  FloorPlanView,
} from "@/server/services/floor-plan/floor-plan.service";

/**
 * SVG floor-plan viewer.
 *
 * The polygons are rendered as an SVG overlay on top of the raster
 * plan image. Coordinates are stored fractionally (0..1) so the same
 * polygon renders correctly across image resolutions. The SVG uses a
 * `viewBox="0 0 100 100"` coordinate system for the same reason —
 * the browser handles the scale.
 *
 * When there is no floor-plan image (i.e. `floorPlanUrl` is null) the
 * viewer degrades gracefully to a stacked list of units.
 */
interface Props {
  view: FloorPlanView;
}

const STATUS_FILL: Record<UnitStatus, string> = {
  AVAILABLE: "rgba(16,185,129,0.35)",
  RESERVED: "rgba(245,158,11,0.35)",
  DEPOSIT_PAID: "rgba(59,130,246,0.35)",
  CONTRACTED: "rgba(99,102,241,0.35)",
  SOLD: "rgba(244,63,94,0.35)",
  BLOCKED: "rgba(107,114,128,0.35)",
  NOT_FOR_SALE: "rgba(107,114,128,0.15)",
  ON_HOLD: "rgba(234,179,8,0.35)",
};

const STATUS_STROKE: Record<UnitStatus, string> = {
  AVAILABLE: "#059669",
  RESERVED: "#d97706",
  DEPOSIT_PAID: "#2563eb",
  CONTRACTED: "#4f46e5",
  SOLD: "#e11d48",
  BLOCKED: "#4b5563",
  NOT_FOR_SALE: "#9ca3af",
  ON_HOLD: "#ca8a04",
};

const STATUS_LABELS: Record<UnitStatus, string> = {
  AVAILABLE: "Slobodno",
  ON_HOLD: "Rezervisano privremeno",
  RESERVED: "Rezervisano",
  DEPOSIT_PAID: "Uplaćen depozit",
  CONTRACTED: "Ugovoreno",
  SOLD: "Prodato",
  BLOCKED: "Blokirano",
  NOT_FOR_SALE: "Nije za prodaju",
};

export function FloorPlanViewer({ view }: Props) {
  const [hovered, setHovered] = useState<FloorPlanAreaView | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const legend = useMemo(() => {
    const seen = new Set<UnitStatus>();
    for (const area of view.areas) seen.add(area.unitStatus);
    return Array.from(seen);
  }, [view.areas]);

  if (!view.floorPlanUrl) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-inset)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
        Ovaj sprat još nema učitanu osnovu. Otvorite izmenu sprata i
        priložite sliku plana.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-md border border-[var(--color-border)] bg-black"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={view.floorPlanUrl}
          alt={`Osnova · ${view.floorLabel}`}
          className="block h-auto w-full select-none"
          loading="lazy"
          draggable={false}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Interaktivne zone jedinica"
        >
          {view.areas.map((area) => {
            const points = area.polygon
              .map((p) => `${(p.x * 100).toFixed(3)},${(p.y * 100).toFixed(3)}`)
              .join(" ");
            if (area.polygon.length < 3) return null;
            const isHover = hovered?.id === area.id;
            return (
              <Link key={area.id} href={`/jedinice/${area.unitId}`} legacyBehavior>
                <a
                  aria-label={`${area.unitCode} · ${STATUS_LABELS[area.unitStatus]}`}
                  className="pointer-events-auto"
                >
                  <polygon
                    points={points}
                    fill={STATUS_FILL[area.unitStatus]}
                    stroke={STATUS_STROKE[area.unitStatus]}
                    strokeWidth={isHover ? 0.6 : 0.35}
                    onMouseEnter={() => setHovered(area)}
                    onMouseLeave={() =>
                      setHovered((cur) => (cur?.id === area.id ? null : cur))
                    }
                    style={{
                      transition: "stroke-width 120ms ease-out",
                      cursor: "pointer",
                    }}
                  />
                </a>
              </Link>
            );
          })}
        </svg>
        {hovered ? (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs shadow">
            <div className="font-semibold">{hovered.unitCode}</div>
            <div className="text-[var(--color-foreground-muted)]">
              {STATUS_LABELS[hovered.unitStatus]}
            </div>
          </div>
        ) : null}
      </div>
      {legend.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {legend.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5"
            >
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ background: STATUS_STROKE[s] }}
              />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Poligoni jedinica još nisu unešeni za ovaj sprat.
        </p>
      )}
    </div>
  );
}
