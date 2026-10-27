"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/studio/FormMessage";
import { setUserDisabled, setUserRole, signOutEverywhere } from "@/lib/admin/actions";
import type { AdminUser } from "@/lib/admin/repository";

export function UserActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState(setUserRole, {});
  const [statusState, statusAction] = useActionState(setUserDisabled, {});
  const [sessionState, sessionAction] = useActionState(signOutEverywhere, {});
  const message = [roleState, statusState, sessionState].find((s) => s.error || s.ok) ?? {};

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
      </div>
      <FormMessage state={message} />
    </div>
  );
}
