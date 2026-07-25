"use client";

import { useMemo, useState } from "react";
import { PlayCircle, Sparkles } from "lucide-react";

import { PRODUCT_VIDEO_URL } from "@/lib/constants/app";

/**
 * Extract the YouTube video id from any commonly-used URL shape:
 *   https://youtu.be/<id>
 *   https://www.youtube.com/watch?v=<id>
 *   https://www.youtube.com/embed/<id>
 *   https://www.youtube.com/shorts/<id>
 * Returns null when the URL is not a recognised YouTube link.
 */
function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts") {
        return parts[1] || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

type VideoMode =
  | { kind: "placeholder" }
  | { kind: "youtube"; id: string }
  | { kind: "mp4"; url: string };

function resolveMode(url: string): VideoMode {
  const trimmed = url.trim();
  if (!trimmed) return { kind: "placeholder" };
  const ytId = parseYouTubeId(trimmed);
  if (ytId) return { kind: "youtube", id: ytId };
  if (/\.mp4($|\?)/i.test(trimmed)) return { kind: "mp4", url: trimmed };
  return { kind: "placeholder" };
}

/**
 * 90-180 second product overview video, embedded just after the hero.
 *
 * Three render modes are auto-selected by `NEXT_PUBLIC_PRODUCT_VIDEO_URL`:
 *   1. Placeholder - when the env is empty; renders a click-to-book
 *      card that points at the demo-booking anchor. This is the default
 *      state until the marketing team publishes a real video.
 *   2. YouTube lite - when the URL matches youtube.com / youtu.be. The
 *      iframe is loaded only after the visitor clicks play, so we don't
 *      pull the ~700 kB YouTube script on every landing view.
 *   3. MP4 - when the URL ends with `.mp4`; renders a native `<video>`
 *      element with `preload="metadata"` and controls.
 */
export function ProductVideo() {
  const [loaded, setLoaded] = useState(false);
  const mode = useMemo<VideoMode>(() => resolveMode(PRODUCT_VIDEO_URL), []);

  return (
    <section
      id="video"
      aria-labelledby="video-title"
      className="scroll-mt-20 bg-white"
    >
      <div className="container-app py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            <Sparkles aria-hidden className="size-3.5" />
            Video demo - 3 minuta
          </div>
          <h2
            id="video-title"
            className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Pogledajte kako izgleda vođenje projekta u realnom vremenu
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            Od projekta i statusa jedinica, preko rezervacije i prodaje, do
            uplate, portala partnerske agencije i izveštaja direktora - sve
            u jednom kratkom pregledu.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <div
            className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--color-border)] bg-neutral-950 shadow-sm"
            role="region"
            aria-label="Video demo PropertyDesk-a"
          >
            {mode.kind === "youtube" ? (
              <YouTubeFacade
                id={mode.id}
                loaded={loaded}
                onLoad={() => setLoaded(true)}
              />
            ) : mode.kind === "mp4" ? (
              <video
                src={mode.url}
                controls
                preload="metadata"
                playsInline
                muted
                className="h-full w-full object-cover"
              >
                Vaš pregledač ne podržava HTML5 video.
              </video>
            ) : (
              <VideoPlaceholder />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function YouTubeFacade({
  id,
  loaded,
  onLoad,
}: {
  id: string;
  loaded: boolean;
  onLoad: () => void;
}) {
  if (loaded) {
    return (
      <iframe
        title="Video demo PropertyDesk-a"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onLoad}
      aria-label="Pokreni video demo PropertyDesk-a"
      className="group relative block h-full w-full cursor-pointer"
    >
      <img
        src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
        alt=""
        className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
        loading="lazy"
      />
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center bg-black/20 transition group-hover:bg-black/30"
      >
        <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-[var(--color-brand-700)] shadow-lg transition group-hover:scale-105">
          <PlayCircle className="size-10" strokeWidth={1.5} />
        </span>
      </span>
    </button>
  );
}

function VideoPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-brand-900)] px-6 text-center text-white">
      <span
        aria-hidden
        className="grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur"
      >
        <PlayCircle className="size-8" strokeWidth={1.5} />
      </span>
      <div className="max-w-lg">
        <h3 className="text-xl font-semibold">Video demo stiže uskoro</h3>
        <p className="mt-2 text-sm text-white/80">
          Pripremamo kratak pregled proizvoda. Do tada, najbrži način da vidite
          PropertyDesk uživo je 25-minutni personalizovan demo.
        </p>
      </div>
      <a
        href="#zakazivanje"
        style={{ color: "#1d4ed8" }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold shadow-lg shadow-black/10 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900"
      >
        Zakažite live demo
      </a>
    </div>
  );
}
