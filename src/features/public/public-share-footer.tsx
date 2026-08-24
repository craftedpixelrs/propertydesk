import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function PublicShareFooter() {
  const t = createT(await resolveRequestLocale());
  const year = String(new Date().getFullYear());

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-center text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>{t("marketing.public.footerPrivate")}</p>
        <p>
          <a
            href={MARKETING_URL}
            className="font-medium text-neutral-600 hover:text-[var(--color-brand-700)] hover:underline"
          >
            {t("marketing.public.poweredBy", { name: APP_NAME })}
          </a>
          <span className="mx-2 text-neutral-300">·</span>
          {t("marketing.public.copyright", { year, name: APP_NAME })}
        </p>
      </div>
    </footer>
  );
}
