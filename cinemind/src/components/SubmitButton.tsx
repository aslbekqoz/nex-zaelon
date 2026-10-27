"use client";

import { useFormStatus } from "react-dom";
import { useActionFormPending } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const status = useFormStatus();
  const pending = useActionFormPending() ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
