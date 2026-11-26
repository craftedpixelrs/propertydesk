import Image from "next/image";

import { blogImagePath, publicFileReady } from "@/features/marketing/blog/image";
import { UnitMatrix } from "@/features/marketing/ui";
import { cn } from "@/lib/utils";

export function BlogFigure({
  file,
  alt,
  width,
  height,
  priority = false,
  sizes,
}: {
  file: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes: string;
}) {
  const src = blogImagePath(file);
  if (!publicFileReady(src)) return null;

  return (
    <figure className="border-line bg-paper overflow-hidden rounded-2xl border">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className="h-auto w-full"
      />
      <figcaption className="text-mute border-line border-t px-4 py-3 text-sm leading-relaxed">
        {alt}
      </figcaption>
    </figure>
  );
}

/**
 * Cover for article cards. Uses the photo when the file is in place;
 * until then it draws a numbered plate, so a list never has a hole.
 */
export function BlogCover({
  file,
  alt,
  index,
  priority = false,
  sizes,
  className,
}: {
  file: string;
  alt: string;
  index: number;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  const src = blogImagePath(file);

  if (publicFileReady(src)) {
    return (
      <div className={cn("bg-paper relative aspect-[1200/630] overflow-hidden", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div aria-hidden className={cn("bg-ink relative aspect-[1200/630] overflow-hidden", className)}>
      <div className="pd-grid pd-grid-dark absolute inset-0" />
      <div className="absolute -top-1/2 -right-1/4 size-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(95,210,216,0.3),transparent)]" />
      <UnitMatrix
        tone="dark"
        className={cn(
          "absolute top-1/2 w-[46%] -translate-y-1/2 opacity-90",
          index % 2 === 0 ? "right-[7%]" : "right-[12%] -rotate-6",
        )}
      />
      <span className="absolute bottom-[9%] left-[7%] font-mono text-[2.6rem] leading-none font-medium tracking-[-0.04em] text-white/90">
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}
