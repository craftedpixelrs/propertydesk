import { formatMoney, type MoneyInput } from "@/lib/formatters";
import { type SupportedCurrency } from "@/lib/constants/app";
import { cn } from "@/lib/utils";

export interface MoneyDisplayProps {
  value: MoneyInput;
  currency: SupportedCurrency;
  decimals?: number;
  withSymbol?: boolean;
  className?: string;
}

export function MoneyDisplay({
  value,
  currency,
  decimals,
  withSymbol,
  className,
}: MoneyDisplayProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatMoney(value, currency, { decimals, withSymbol })}
    </span>
  );
}
