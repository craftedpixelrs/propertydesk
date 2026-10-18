import { choosePost } from "@/features/marketing/blog/posts/choose";
import { commissionsPost } from "@/features/marketing/blog/posts/commissions";
import { contractPost } from "@/features/marketing/blog/posts/contract";
import { excelPost } from "@/features/marketing/blog/posts/excel";
import { handoverPost } from "@/features/marketing/blog/posts/handover";
import { ipsPost } from "@/features/marketing/blog/posts/ips";
import { kycPost } from "@/features/marketing/blog/posts/kyc";
import { paymentPlanPost } from "@/features/marketing/blog/posts/payment-plan";
import { paymentsPost } from "@/features/marketing/blog/posts/payments";
import { priceListPost } from "@/features/marketing/blog/posts/price-list";
import { sharePost } from "@/features/marketing/blog/posts/share";
import { statusPost } from "@/features/marketing/blog/posts/status";
import type { BlogLocale, BlogPost } from "@/features/marketing/blog/types";

/**
 * Articles dated through September 2026, the month before the
 * 15.11.2026 launch. Copy is operational, not a customer story.
 */
export const BLOG_POSTS: BlogPost[] = [
  excelPost,
  statusPost,
  priceListPost,
  ipsPost,
  commissionsPost,
  paymentPlanPost,
  kycPost,
  contractPost,
  handoverPost,
  sharePost,
  paymentsPost,
  choosePost,
];

const bySlug = new Map(BLOG_POSTS.map((post) => [post.slug, post]));

export function blogLocale(locale: string): BlogLocale {
  return locale === "en" ? "en" : "sr";
}

export function blogPostsNewestFirst(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.published < b.published ? 1 : -1));
}

export function blogPostBySlug(slug: string): BlogPost | undefined {
  return bySlug.get(slug);
}

export function relatedPosts(slug: string, limit = 3): BlogPost[] {
  return blogPostsNewestFirst()
    .filter((post) => post.slug !== slug)
    .slice(0, limit);
}
