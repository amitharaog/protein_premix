"use client";

import { useFormStatus } from "react-dom";

/** A form's submit button that disables itself and says so while the server action runs. */
export function SubmitButton({ children, pending, className = "", disabled }: {
  children: React.ReactNode; pending: string; className?: string; disabled?: boolean;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" disabled={disabled || status.pending} aria-disabled={disabled || status.pending} className={className}>
      {status.pending ? pending : children}
    </button>
  );
}
