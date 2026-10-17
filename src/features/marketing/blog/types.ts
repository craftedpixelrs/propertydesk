export type BlogLocale = "sr" | "en";

export interface BlogCopy {
  title: string;
  description: string;
  excerpt: string;
  dateLabel: string;
  coverAlt: string;
  blocks: BlogBlock[];
}

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "ul"; items: string[] }
  | { type: "figure"; file: string; alt: string; width: number; height: number };

export interface BlogPost {
  slug: string;
  published: string;
  modified: string;
  minutes: number;
  /** File in `public/images/blog/`, 1200×630. Card, article top, and share image. */
  coverFile: string;
  copy: Record<BlogLocale, BlogCopy>;
}
