"use client";

import { useEffect, useState } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { useI18n } from "@/components/app/i18n-provider";
import {
  dateInputPlaceholder,
  dateTimeInputPlaceholder,
  formatDateInputValue,
  formatDateTimeInputValue,
  parseDateInputValue,
  parseDateTimeInputValue,
} from "@/lib/formatters/date";
import { cn } from "@/lib/utils";

type SharedProps = Omit<InputProps, "type" | "value" | "onChange" | "defaultValue"> & {
  value: string;
  onChange: (iso: string) => void;
};

/**
 * Date field that shows `DD.MM.YYYY` in Serbian and `MM/DD/YYYY` in English.
 * Parent state stays ISO `yyyy-MM-dd`, so a language switch reformats the same day.
 */
export function DateInput({
  value,
  onChange,
  name,
  className,
  ...props
}: SharedProps) {
  const { locale } = useI18n();
  const [text, setText] = useState(() =>
    value ? formatDateInputValue(value, locale) : "",
  );

  useEffect(() => {
    setText(value ? formatDateInputValue(value, locale) : "");
  }, [value, locale]);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={props.placeholder ?? dateInputPlaceholder(locale)}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            onChange("");
            return;
          }
          const iso = parseDateInputValue(next, locale);
          if (iso) onChange(iso);
        }}
        onBlur={() => {
          if (!text.trim()) {
            onChange("");
            setText("");
            return;
          }
          const iso = parseDateInputValue(text, locale);
          if (iso) setText(formatDateInputValue(iso, locale));
        }}
        className={cn(className)}
      />
    </>
  );
}

/**
 * Date+time field. Value stays `yyyy-MM-ddTHH:mm`.
 * Serbian: `DD.MM.YYYY HH:mm`. English: `MM/DD/YYYY HH:mm`.
 */
export function DateTimeInput({
  value,
  onChange,
  name,
  className,
  ...props
}: SharedProps) {
  const { locale } = useI18n();
  const [text, setText] = useState(() =>
    value ? formatDateTimeInputValue(value, locale) : "",
  );

  useEffect(() => {
    setText(value ? formatDateTimeInputValue(value, locale) : "");
  }, [value, locale]);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        {...props}
        type="text"
        autoComplete="off"
        placeholder={props.placeholder ?? dateTimeInputPlaceholder(locale)}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            onChange("");
            return;
          }
          const local = parseDateTimeInputValue(next, locale);
          if (local) onChange(local);
        }}
        onBlur={() => {
          if (!text.trim()) {
            onChange("");
            setText("");
            return;
          }
          const local = parseDateTimeInputValue(text, locale);
          if (local) setText(formatDateTimeInputValue(local, locale));
        }}
        className={cn(className)}
      />
    </>
  );
}
