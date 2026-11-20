"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";

const OTP_LENGTH = 6;

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OtpCodeField({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  const [code, setCode] = useState("");
  const fieldRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const nextIndex = Math.min(code.length, OTP_LENGTH - 1);

  useEffect(() => {
    if (!disabled) submitting.current = false;
  }, [disabled]);

  function apply(next: string) {
    setCode(next);
    if (next.length < OTP_LENGTH) {
      submitting.current = false;
      return;
    }
    const input = fieldRef.current;
    if (!input || disabled || submitting.current) return;
    submitting.current = true;
    input.value = next;
    input.form?.requestSubmit();
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    apply(digits(event.target.value));
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    apply(digits(text));
  }

  return (
    <div className="group relative">
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <div
            key={index}
            className={`flex h-12 items-center justify-center rounded-none border bg-paper text-xl font-semibold tabular-nums text-heading ${
              index === nextIndex
                ? "border-line group-focus-within:border-accent"
                : "border-line"
            }`}
          >
            {code[index] ?? ""}
          </div>
        ))}
      </div>
      <input
        ref={fieldRef}
        id="code"
        name="code"
        value={code}
        onChange={onChange}
        onPaste={onPaste}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        minLength={OTP_LENGTH}
        maxLength={OTP_LENGTH}
        pattern="[0-9]{6}"
        className="absolute inset-0 h-full w-full cursor-text bg-transparent p-0 text-transparent caret-transparent outline-none"
      />
    </div>
  );
}
