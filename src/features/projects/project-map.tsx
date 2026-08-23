"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

/**
 * Leaflet's default icon URLs resolve relative to the CSS file, which
 * breaks under Webpack/Next.js. We rewire them once to Leaflet's CDN
 * copies so the marker renders in production without shipping raster
 * assets ourselves. This must run on the client only.
 */
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

export interface ProjectMapProps {
  latitude: number | null;
  longitude: number | null;
  /**
   * When set, clicking on the map fires this callback with the newly
   * picked coordinates. Used by the project edit form.
   */
  onPick?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
  zoom?: number;
  /** Height of the map container in pixels. */
  heightPx?: number;
}

const DEFAULT_CENTER: [number, number] = [44.7866, 20.4489]; // Beograd

export function ProjectMap({
  latitude,
  longitude,
  onPick,
  className,
  zoom = 15,
  heightPx = 320,
}: ProjectMapProps) {
  const hasCoords = latitude != null && longitude != null;
  const center: [number, number] = hasCoords
    ? [latitude, longitude]
    : DEFAULT_CENTER;

  return (
    <div
      className={className}
      style={{ height: heightPx, width: "100%", overflow: "hidden", borderRadius: 8 }}
    >
      <MapContainer
        center={center}
        zoom={hasCoords ? zoom : 12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{y}/{x}.png"
        />
        {hasCoords ? <Marker position={[latitude, longitude]} /> : null}
        <InvalidateSize />
        <RecenterOnChange coords={hasCoords ? [latitude, longitude] : null} />
        {onPick ? <ClickHandler onPick={onPick} /> : null}
      </MapContainer>
    </div>
  );
}

function InvalidateSize() {
  const map = useMap();
  React.useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 280);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function RecenterOnChange({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (coords) map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (coords: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}
