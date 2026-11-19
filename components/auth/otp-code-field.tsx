"use client";

import { useState, type ChangeEvent, type ClipboardEvent } from "react";

const OTP_LENGTH = 6;

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OtpCodeField({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  const [code, setCode] = useState("");
  const nextIndex = Math.min(code.length, OTP_LENGTH - 1);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setCode(digits(event.target.value));
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    setCode(digits(text));
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
