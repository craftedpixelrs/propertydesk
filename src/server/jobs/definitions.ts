import "server-only";
import { getJob, registerJob } from "@/server/jobs";
import { expireDueReservations } from "@/server/services/reservations.service";
import { expireDueProtections } from "@/server/services/agencies/registrations.service";
import { notifyBuyerProtectionsExpiringSoon } from "@/server/services/agencies/protection-jobs";
import {
  markInstallmentsOverdue,
  notifyDueSoonInstallments,
} from "@/server/services/sales/installments-jobs";
import { notifyTrialsExpiring } from "@/server/services/subscriptions/jobs";
import { expireEndedSubscriptions } from "@/server/services/subscriptions/expire.service";
import { runBackupVerify } from "@/server/services/monitoring/backup-verify.service";
import { purgeExpiredDeletedDocuments } from "@/server/services/documents-purge.service";
// Side-effect import: registers all billing cron jobs into the shared registry.
import "@/server/services/billing/jobs/definitions";

/**
 * Registers all scheduled jobs exactly once. Importing this module has the
 * side effect of populating the job registry. The `/api/v1/jobs/[name]` route
 * imports it so the registry is warm before dispatching.
 *
 * Registration is guarded so hot-reload / repeated imports don't throw.
 */
function ensure(name: string, register: () => void): void {
  if (!getJob(name)) register();
}

ensure("expire-reservations", () =>
  registerJob({
    name: "expire-reservations",
    description:
      "Označava istekle odobrene rezervacije (expiresAt u prošlosti) i vraća jedinice u status 'Dostupno'.",
    suggestedCron: "*/15 * * * *",
    run: async () => {
      const { processed, errors } = await expireDueReservations();
      return { processed, updated: processed, errors };
    },
  }),
);

ensure("expire-buyer-protection", () =>
  registerJob({
    name: "expire-buyer-protection",
    description:
      "Označava istekle zaštićene registracije agencijskih kupaca (protectionEndsAt u prošlosti) kao EXPIRED.",
    suggestedCron: "0 * * * *",
    run: async () => {
      const { processed, errors } = await expireDueProtections();
      return { processed, updated: processed, errors };
    },
  }),
);

ensure("mark-installments-overdue", () =>
  registerJob({
    name: "mark-installments-overdue",
    description:
      "Prelazi rate sa isteklim rokom u status OVERDUE i propagira status plana plaćanja.",
    suggestedCron: "0 3 * * *",
    run: async () => {
      const { processed, errors } = await markInstallmentsOverdue();
      return { processed, updated: processed, errors };
    },
  }),
);

ensure("due-soon-notifications", () =>
  registerJob({
    name: "due-soon-notifications",
    description:
      "Obavesti odgovorne korisnike o ratama koje dospevaju u narednih 7 dana, kao i o kupcima čija zaštita ističe.",
    suggestedCron: "30 6 * * *",
    run: async () => {
      const [installments, protections] = await Promise.all([
        notifyDueSoonInstallments(),
        notifyBuyerProtectionsExpiringSoon(),
      ]);
      return {
        processed: installments.processed + protections.processed,
        errors: installments.errors + protections.errors,
        details: {
          installments,
          protections,
        },
      };
    },
  }),
);

ensure("expire-subscriptions", () =>
  registerJob({
    name: "expire-subscriptions",
    description:
      "Istekli trial i istekli plaćeni periodi: pretplata EXPIRED/RESTRICTED, organizacija RESTRICTED (pristup se gasi).",
    suggestedCron: "15 4 * * *",
    run: async () => {
      const { processed, errors } = await expireEndedSubscriptions();
      return { processed, updated: processed, errors };
    },
  }),
);

ensure("trial-expiration-notifications", () =>
  registerJob({
    name: "trial-expiration-notifications",
    description:
      "Obavesti vlasnike organizacija čiji probni period ističe u narednih 7 dana. Istovremeno gasi već istekle trial/periode.",
    suggestedCron: "0 7 * * *",
    run: async () => {
      const expired = await expireEndedSubscriptions();
      const { processed, errors } = await notifyTrialsExpiring();
      return {
        processed: processed + expired.processed,
        updated: processed + expired.processed,
        errors: errors + expired.errors,
        details: { expired, notifications: { processed, errors } },
      };
    },
  }),
);

ensure("backup-verify", () =>
  registerJob({
    name: "backup-verify",
    description:
      "Nedeljna provera integriteta najsvežijeg pg_dump fajla. Beleži rezultat u system_health_check i šalje email upozorenje na 2 uzastopna neuspeha.",
    // Weekly, Sundays at 04:30 (server time). Runs after most nightly
    // backups have finished but before any Monday morning traffic.
    suggestedCron: "30 4 * * 0",
    run: async () => {
      const { outcome } = await runBackupVerify();
      return {
        processed: 1,
        updated: outcome.status === "OK" ? 1 : 0,
        errors: outcome.status === "FAIL" ? 1 : 0,
        details: {
          status: outcome.status,
          message: outcome.message,
          fileName: outcome.fileName,
          fileSize: outcome.fileSize,
        },
      };
    },
  }),
);

ensure("purge-deleted-documents", () =>
  registerJob({
    name: "purge-deleted-documents",
    description:
      "Briše sa storage-a (S3/local) objekte dokumenata koji su u aplikaciji obrisani pre 45 dana.",
    suggestedCron: "0 4 * * *",
    run: async () => {
      const { processed, errors } = await purgeExpiredDeletedDocuments();
      return { processed, updated: processed, errors };
    },
  }),
);
