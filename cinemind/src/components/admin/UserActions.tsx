"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/studio/FormMessage";
import { createResetLink, markEmailVerified, setUserDisabled, setUserRole, signOutEverywhere } from "@/lib/admin/actions";
import type { AdminUser } from "@/lib/admin/repository";

export function UserActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState(setUserRole, {});
  const [statusState, statusAction] = useActionState(setUserDisabled, {});
  const [sessionState, sessionAction] = useActionState(signOutEverywhere, {});
  const [resetState, resetAction] = useActionState(createResetLink, {});
  const [verifyState, verifyAction] = useActionState(markEmailVerified, {});
  const message = [roleState, statusState, sessionState, resetState, verifyState].find((s) => s.error || s.ok) ?? {};

  return (
    <div className="user-actions">
      <div className="tool-row">
        {!isSelf ? (
          <form action={roleAction}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="role" value={user.role === "admin" ? "user" : "admin"} />
            <SubmitButton className="btn btn-sm" pendingText="…">
              {user.role === "admin" ? "Remove admin" : "Make admin"}
            </SubmitButton>
          </form>
        ) : null}
        {!isSelf ? (
          <form
            action={statusAction}
            onSubmit={(e) => {
              if (!user.disabledAt && !confirm(`Disable ${user.email}? They will be signed out and unable to sign in.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="disabled" value={user.disabledAt ? "0" : "1"} />
            <SubmitButton className={`btn btn-sm${user.disabledAt ? "" : " btn-ghost danger"}`} pendingText="…">
              {user.disabledAt ? "Enable" : "Disable"}
            </SubmitButton>
          </form>
        ) : null}
        <form action={sessionAction}>
          <input type="hidden" name="id" value={user.id} />
          <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
            Sign out everywhere
          </SubmitButton>
        </form>
        {!user.emailVerifiedAt ? (
          <form action={verifyAction}>
            <input type="hidden" name="id" value={user.id} />
            <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
              Mark email verified
            </SubmitButton>
          </form>
        ) : null}
        {!user.disabledAt ? (
          <form action={resetAction}>
            <input type="hidden" name="id" value={user.id} />
            <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
              Create reset link
            </SubmitButton>
          </form>
        ) : null}
      </div>
      <FormMessage state={message} />
      {resetState.link && message === resetState ? (
        <div className="tool-row">
          <input className="input input-sm mono" value={resetState.link} readOnly aria-label="Reset link" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(resetState.link!)}>
            Copy
          </button>
        </div>
      ) : null}
    </div>
  );
}
