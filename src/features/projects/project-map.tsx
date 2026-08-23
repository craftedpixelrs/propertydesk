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
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Leaflet measures the container on create. In a sliding drawer the
  // map is often off-screen or mid-animation, so wait until it is
  // actually visible before mounting.
  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const show = () => setMounted(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    const fallback = window.setTimeout(show, 800);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ height: heightPx, width: "100%", overflow: "hidden", borderRadius: 8 }}
    >
      {mounted ? (
        <MapContainer
          center={center}
          zoom={hasCoords ? zoom : 12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasCoords ? <Marker position={[latitude, longitude]} /> : null}
          <SyncView
            latitude={latitude}
            longitude={longitude}
            focusZoom={zoom}
          />
          {onPick ? <ClickHandler onPick={onPick} /> : null}
        </MapContainer>
      ) : null}
    </div>
  );
}

function SyncView({
  latitude,
  longitude,
  focusZoom,
}: {
  latitude: number | null;
  longitude: number | null;
  focusZoom: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    const fixSize = () => map.invalidateSize({ animate: false });
    const el = map.getContainer();
    const ro = new ResizeObserver(fixSize);
    ro.observe(el);
    const ticks = [0, 80, 250, 500].map((ms) => window.setTimeout(fixSize, ms));
    return () => {
      ro.disconnect();
      ticks.forEach((id) => window.clearTimeout(id));
    };
  }, [map]);

  React.useEffect(() => {
    if (latitude == null || longitude == null) return;
    map.invalidateSize({ animate: false });
    map.setView([latitude, longitude], focusZoom, { animate: false });
  }, [map, latitude, longitude, focusZoom]);

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
