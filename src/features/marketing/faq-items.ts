import type { TranslateFn, TranslationKey } from "@/lib/i18n";

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function faqItems(translate: TranslateFn) {
  return FAQ_KEYS.map((n) => ({
    question: translate(`marketing.faq.q${n}` as TranslationKey),
    answer: translate(`marketing.faq.a${n}` as TranslationKey),
  }));
}
