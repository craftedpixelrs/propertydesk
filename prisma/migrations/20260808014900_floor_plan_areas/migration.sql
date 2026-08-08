-- Interactive floor-plan overlays.
--
-- Each `FloorPlanArea` row is a polygon anchored to a `unit` on a
-- `floor`. Coordinates are stored as fractional (0..1) values in the
-- `polygon` JSON so the SVG overlay renders correctly at any image
-- scale. The 11a viewer paints the polygon by the unit's current
-- status (AVAILABLE / RESERVED / SOLD / …); the 11b editor (post
-- 2026-09-01) will add polygon authoring in the UI.
CREATE TABLE "floor_plan_area" (
    "id"             TEXT      NOT NULL,
    "organizationId" TEXT      NOT NULL,
    "floorId"        TEXT      NOT NULL,
    "unitId"         TEXT      NOT NULL,
    "polygon"        JSONB     NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plan_area_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "floor_plan_area_organizationId_floorId_idx"
    ON "floor_plan_area"("organizationId", "floorId");
CREATE INDEX "floor_plan_area_unitId_idx"
    ON "floor_plan_area"("unitId");

ALTER TABLE "floor_plan_area"
    ADD CONSTRAINT "floor_plan_area_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "floor_plan_area"
    ADD CONSTRAINT "floor_plan_area_floorId_fkey"
    FOREIGN KEY ("floorId") REFERENCES "floor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "floor_plan_area"
    ADD CONSTRAINT "floor_plan_area_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "unit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
