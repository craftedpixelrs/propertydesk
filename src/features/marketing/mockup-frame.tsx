import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Device / device-less frame used on the landing page.
 *
 * When `src` is provided we render the image directly in its natural
 * aspect ratio wrapped in a rounded, softly-shadowed container. Any
 * browser or device chrome (traffic-light dots, notch, etc.) is
 * intentionally omitted so we don't fight the mockup art that the image
 * itself already ships with.
 *
 * When `src` is omitted we fall back to a neutral "coming soon"
 * placeholder in a canonical aspect ratio (16:10 desktop, 9:19 mobile).
 * That way the section still has a visual anchor while assets are being
 * finalised - and swapping in the image later doesn't shift the layout
 * more than the intrinsic image size difference.
 *
 * Drop your assets under [public/images/landing/](../../../public/images/landing)
 * and reference them through `LANDING_IMAGES` in
 * [src/lib/constants/app.ts](../../lib/constants/app.ts).
 */
export interface MockupFrameProps {
  variant: "desktop" | "mobile";
  /** Absolute path under `/public`. When omitted, placeholder renders. */
  src?: string;
  /** Alt text for screen readers + SEO. */
  alt?: string;
  /**
   * Natural intrinsic dimensions of the source image. Required for
   * `next/image` to reserve the right amount of space and prevent
   * layout shift. When omitted, sensible defaults per variant are used.
   */
  width?: number;
  height?: number;
  /** Label shown on the placeholder when `src` is not set. */
  label?: string;
  /** Whether Next.js should treat this as an above-the-fold image. */
  priority?: boolean;
  className?: string;
}

const DEFAULT_DESKTOP_SIZE = { width: 1448, height: 1086 };
const DEFAULT_MOBILE_SIZE = { width: 1122, height: 1402 };

export function MockupFrame({
  variant,
  src,
  alt,
  width,
  height,
  label = "Prikaz uskoro",
  priority,
  className,
}: MockupFrameProps) {
  if (variant === "mobile") {
    if (src) {
      const dims = { width: width ?? DEFAULT_MOBILE_SIZE.width, height: height ?? DEFAULT_MOBILE_SIZE.height };
      return (
        <div
          className={cn(
            "relative mx-auto w-[280px] sm:w-[340px] lg:w-[380px]",
            "overflow-hidden rounded-[2rem]",
            className,
          )}
        >
          <Image
            src={src}
            alt={alt ?? "PropertyDesk mobilni prikaz"}
            width={dims.width}
            height={dims.height}
            priority={priority}
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 340px, 280px"
            className="h-auto w-full"
          />
        </div>
      );
    }
    return (
      <div
        role="img"
        aria-label={`Prikaz mobilnog interfejsa PropertyDesk - ${label}`}
        className={cn(
          "relative mx-auto w-[220px] sm:w-[260px]",
          "aspect-[9/19] overflow-hidden rounded-[2.25rem] border-[10px] border-[var(--color-foreground)] bg-[var(--color-surface)] shadow-2xl",
          className,
        )}
      >
        <div className="absolute left-1/2 top-1 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[var(--color-foreground)]/80" />
        <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-surface-inset)] p-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto h-8 w-8 rounded-md bg-[var(--color-brand-600)]/10" />
            <div className="text-xs font-medium text-[var(--color-foreground-muted)]">
              {label}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (src) {
    const dims = { width: width ?? DEFAULT_DESKTOP_SIZE.width, height: height ?? DEFAULT_DESKTOP_SIZE.height };
    return (
      <div
        className={cn(
          "relative w-full max-w-3xl lg:max-w-none",
          "overflow-hidden rounded-xl",
          className,
        )}
      >
        <Image
          src={src}
          alt={alt ?? "PropertyDesk kontrolna tabla"}
          width={dims.width}
          height={dims.height}
          priority={priority}
          sizes="(min-width: 1024px) 50vw, (min-width: 640px) 75vw, 95vw"
          className="h-auto w-full"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Prikaz desktop interfejsa PropertyDesk - ${label}`}
      className={cn(
        "relative w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-inset)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-[11px] font-medium text-[var(--color-foreground-subtle)]">
          my.propertydesk.app
        </span>
      </div>
      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-surface-inset)]">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-[var(--color-brand-600)]/10" />
          <div className="text-sm font-medium text-[var(--color-foreground-muted)]">
            {label}
          </div>
          <div className="mx-auto max-w-xs text-xs text-[var(--color-foreground-subtle)]">
            Ovde će biti prikaz kontrolne table sa projektima, prodajama i uplatama.
          </div>
        </div>
      </div>
    </div>
  );
}
