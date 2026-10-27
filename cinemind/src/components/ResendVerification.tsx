"use client";

import { useActionState } from "react";
import { resendVerification } from "@/lib/auth/actions";

export function ResendVerification() {
  const [state, action, pending] = useActionState(resendVerification, {});
  if (state.ok) return <span className="verify-msg ok">{state.ok}</span>;
  return (
    <form action={action} className="verify-form">
      <button type="submit" className="btn btn-sm" disabled={pending}>
        {pending ? "Sending…" : "Resend email"}
      </button>
      {state.error ? <span className="verify-msg err">{state.error}</span> : null}
    </form>
  );
}
