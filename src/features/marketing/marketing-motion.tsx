"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Turns on the marketing motion only when the visitor has not asked
 * for reduced motion. Cards marked with data-reveal ease in once,
 * then drop the animation so hover transforms stay free.
 */
export function MarketingMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector(".marketing-site");
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.remove("pd-motion");
      return;
    }
    root.classList.add("pd-motion");

    const nodes = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-settled)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.classList.add("is-in");
          node.addEventListener("animationend", () => node.classList.add("is-settled"), {
            once: true,
          });
          io.unobserve(node);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const shown = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      if (shown) {
        node.classList.add("is-in");
        node.addEventListener("animationend", () => node.classList.add("is-settled"), {
          once: true,
        });
      } else {
        io.observe(node);
      }
    }

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
