"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Six-digit code field. Submits as soon as the sixth digit is entered.
 */
export function OtpCodeInput({
  id,
  label,
  hint,
  error,
  disabled,
  onComplete,
}: {
  id: string;
  label: string;
  hint?: string;
  error: string | null;
  disabled?: boolean;
  onComplete: (code: string) => void | Promise<void>;
}) {
  const [code, setCode] = useState("");
  const lastTried = useRef("");

  useEffect(() => {
    if (!error) return;
    setCode("");
    lastTried.current = "";
  }, [error]);

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && digits !== lastTried.current && !disabled) {
      lastTried.current = digits;
      void onComplete(digits);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          pattern="[0-9]*"
          value={code}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="text-center font-mono text-lg tracking-[0.4em]"
          aria-invalid={error ? true : undefined}
        />
      </div>
      {hint ? <p className="text-xs text-[var(--color-foreground-muted)]">{hint}</p> : null}
    </div>
  );
}
