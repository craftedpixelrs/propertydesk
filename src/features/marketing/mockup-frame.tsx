import Image from "next/image";

import { cn } from "@/lib/utils";

export interface AppScreen {
  src: string;
  width: number;
  height: number;
}

/**
 * Every desktop capture shares the same sidebar and top bar, so one
 * offset hides both and the table or cards read larger. Narrow windows
 * zoom further in (190%), so a row of the table is still readable.
 */
const CONTENT_SHIFT = "translate(-19%, -7%)";
const ZOOM = {
  page: "w-[125%]",
  detail: "w-[190%]",
  /** Detail on phones, the whole page once the window is wide. */
  auto: "w-[190%] lg:w-[125%]",
} as const;

/**
 * A real product screen inside a drawn browser window. The chrome is
 * markup, so the screen stays sharp and no device art fights the brand.
 * `crop` keeps the window at a fixed shape and shows only the page
 * content.
 */
export function BrowserFrame({
  screen,
  alt,
  sizes,
  priority,
  crop,
  detail = false,
  url = "my.propertydesk.app",
  className,
}: {
  screen: AppScreen;
  alt: string;
  sizes: string;
  priority?: boolean;
  /**
   * Tailwind aspect class for a content-only window, for example
   * `aspect-[16/10]`. Nothing taller than that, or the capture runs out.
   */
  crop?: string;
  /** With `crop`: show the top-left of the page content, larger. `"phone"` does so only on narrow screens. */
  detail?: boolean | "phone";
  url?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line overflow-hidden rounded-2xl border bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_40px_80px_-40px_rgba(10,27,61,0.45),0_12px_28px_-18px_rgba(10,27,61,0.3)]",
        className,
      )}
    >
      <div className="border-line bg-paper flex h-9 items-center gap-3 border-b px-3.5">
        <div aria-hidden className="flex gap-1.5">
          <span className="bg-ink/15 size-2.5 rounded-full" />
          <span className="bg-ink/15 size-2.5 rounded-full" />
          <span className="bg-tide/60 size-2.5 rounded-full" />
        </div>
        <div
          aria-hidden
          className="border-line text-faint mx-auto flex h-5 w-full max-w-[16rem] items-center justify-center rounded-md border bg-white px-2 font-mono text-[10px] tracking-wide"
        >
          <span className="truncate">{url}</span>
        </div>
        <div aria-hidden className="w-[2.6rem]" />
      </div>
      {crop ? (
        <div className={cn("relative w-full overflow-hidden bg-[#f3f6fa]", crop)}>
          <Image
            src={screen.src}
            alt={alt}
            width={screen.width}
            height={screen.height}
            sizes={sizes}
            priority={priority}
            className={cn(
              "absolute top-0 left-0 h-auto max-w-none",
              detail === "phone" ? ZOOM.auto : detail ? ZOOM.detail : ZOOM.page,
            )}
            style={{ transform: CONTENT_SHIFT }}
          />
        </div>
      ) : (
        <Image
          src={screen.src}
          alt={alt}
          width={screen.width}
          height={screen.height}
          sizes={sizes}
          priority={priority}
          className="h-auto w-full"
        />
      )}
    </div>
  );
}

/** The phone view of the app, in a drawn bezel. */
export function PhoneFrame({
  screen,
  alt,
  sizes,
  className,
}: {
  screen: AppScreen;
  alt: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-ink-950 rounded-[2.2rem] p-[7px] shadow-[0_40px_70px_-30px_rgba(10,27,61,0.6),0_0_0_1px_rgba(255,255,255,0.08)_inset]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-white">
        <div aria-hidden className="grid h-5 place-items-center bg-white">
          <span className="bg-ink-950 h-[5px] w-14 rounded-full" />
        </div>
        <Image
          src={screen.src}
          alt={alt}
          width={screen.width}
          height={screen.height}
          sizes={sizes}
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
