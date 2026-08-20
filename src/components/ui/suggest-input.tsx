"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SuggestOption {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  id: string;
  name: string;
  value: string;
  options: SuggestOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
  onQueryChange?: (value: string) => void;
  onSelect?: (option: SuggestOption) => void;
  onOpen?: () => void;
  onBlur?: () => void;
}

export function SuggestInput({
  id,
  name,
  value,
  options,
  loading = false,
  disabled = false,
  placeholder,
  emptyLabel,
  onChange,
  onQueryChange,
  onSelect,
  onOpen,
  onBlur,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [options]);

  function choose(option: SuggestOption) {
    onChange(option.label);
    onSelect?.(option);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onBlur={() => onBlur?.()}
        onFocus={() => {
          setOpen(true);
          onOpen?.();
        }}
        onChange={(event) => {
          onChange(event.target.value);
          onQueryChange?.(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && open && options[active]) {
            event.preventDefault();
            choose(options[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-white py-1 shadow-md"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-[var(--color-foreground-muted)]">
              …
            </li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-foreground-muted)]">
              {emptyLabel}
            </li>
          ) : (
            options.map((option, index) => (
              <li key={option.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    index === active
                      ? "bg-[var(--color-surface-inset)]"
                      : "hover:bg-neutral-50"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                >
                  <span>{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {option.hint}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
