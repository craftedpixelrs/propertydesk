export type DepositPayeeKind = "investor" | "agency";

export interface DepositPaymentInstructions {
  kind: DepositPayeeKind;
  recipientName: string;
  accountNumber: string | null;
  bankName: string | null;
  reference: string;
  amount: string;
  currency: string;
}

const KIND_LABEL: Record<DepositPayeeKind, string> = {
  investor: "investitor",
  agency: "agencija",
};

/** Plain-text lines for buyer emails (kapara / avans). */
export function paymentInstructionLines(
  payment: DepositPaymentInstructions,
): string[] {
  const lines = [
    "Uplata kapare / avansa:",
    `Primalac: ${payment.recipientName} (${KIND_LABEL[payment.kind]})`,
  ];
  if (payment.accountNumber) {
    lines.push(`Tekući račun: ${payment.accountNumber}`);
    if (payment.bankName) lines.push(`Banka: ${payment.bankName}`);
  } else {
    lines.push(
      "Broj računa još nije unet kod primaoca. Kontaktirajte ga za uplatu.",
    );
  }
  lines.push(`Iznos: ${payment.amount} ${payment.currency}`);
  lines.push(`Poziv na broj: ${payment.reference}`);
  return lines;
}

export function formatPayeeName(profile: {
  legalName?: string | null;
  displayName?: string | null;
}): string {
  const legal = profile.legalName?.trim();
  const display = profile.displayName?.trim();
  return legal || display || "Nepoznat primalac";
}
