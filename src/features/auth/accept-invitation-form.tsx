"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormActions } from "@/components/forms/form-actions";
import { t } from "@/lib/i18n";

export function AcceptInvitationForm({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId });
      if (res.error) {
        setError(res.error.message ?? t("errors.generic"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormActions>
        <Button onClick={handleAccept} loading={submitting} className="w-full sm:w-auto">
          {t("auth.acceptInvitation")}
        </Button>
      </FormActions>
    </div>
  );
}
