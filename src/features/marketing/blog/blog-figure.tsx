import Image from "next/image";

import { blogImagePath, publicFileReady } from "@/features/marketing/blog/image";

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
    <figure className="overflow-hidden rounded-3xl border border-[#0b1020]/10 bg-[#f7f3ea]">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className="h-auto w-full"
      />
      <figcaption className="px-4 py-3 text-sm leading-relaxed text-[#3d4558]">{alt}</figcaption>
    </figure>
  );
}
