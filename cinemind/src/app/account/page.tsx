import type { Metadata } from "next";
import Link from "next/link";
import { AvatarForm } from "@/components/AvatarForm";
import { ChangeEmailForm } from "@/components/ChangeEmailForm";
import { ChangeNameForm } from "@/components/ChangeNameForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { UserAvatar } from "@/components/UserAvatar";
import { cancelPendingEmailChange } from "@/lib/auth/actions";
import { getPendingChange } from "@/lib/auth/change-email";
import { needsEmailConfirmation, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Unconfirmed users can open this page too: it's how they fix a mistyped address
export default async function AccountPage() {
  const user = await requireUser("/account");
  const pending = await getPendingChange(user.id);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Account</h1>
      </div>

      <section className="card-panel account-summary">
        <UserAvatar name={user.name} avatarKey={user.avatarKey} size={88} />
        <div className="account-summary-body">
        <dl className="facts" style={{ margin: 0 }}>
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd style={{ overflowWrap: "anywhere" }}>
            {user.email}{" "}
            {user.emailVerified ? (
              <span className="badge status-ready">Confirmed</span>
            ) : (
              <span className="badge status-unverified">Not confirmed</span>
            )}
          </dd>
        </dl>
        {!user.emailVerified ? (
          <p className="faint" style={{ fontSize: 14, margin: "12px 0 0" }}>
            Didn&apos;t get the confirmation email? <Link href="/confirm-email" className="link">Resend it</Link>, or change the address below if it&apos;s wrong.
          </p>
        ) : null}
        {needsEmailConfirmation(user) ? (
          <p className="faint" style={{ fontSize: 13, margin: 0 }}>
            Confirm your email address to add a profile picture.
          </p>
        ) : (
          <AvatarForm hasAvatar={Boolean(user.avatarKey)} />
        )}
        </div>
      </section>

      <section className="card-panel">
        <h2>Change name</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Shown in the header and, for editors, in the Content Studio and activity log.
        </p>
        <ChangeNameForm current={user.name} />
      </section>

      <section className="card-panel">
        <h2>Change email</h2>
        {pending ? (
          <div className="pending-change">
            <p>
              Waiting for you to confirm <strong style={{ overflowWrap: "anywhere" }}>{pending.newEmail}</strong> — we sent a link there on{" "}
              {when(pending.createdAt)}. It expires {when(pending.expiresAt)}. Until then your account keeps {user.email}.
            </p>
            <form action={cancelPendingEmailChange}>
              <button type="submit" className="btn btn-sm">
                Cancel this change
              </button>
            </form>
            <p className="faint" style={{ fontSize: 14, marginTop: 16 }}>
              Typed the wrong address? Request a new change below; it replaces this one.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ margin: "4px 0 0" }}>
            We&apos;ll send a link to the new address; your email changes once you open it. We&apos;ll also let your current address know.
          </p>
        )}
        <ChangeEmailForm />
      </section>

      <section className="card-panel">
        <h2>Change password</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          You&apos;ll stay signed in here; other devices will be signed out. Forgot your current password?{" "}
          <Link href="/forgot-password" className="link">Reset it</Link>.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="card-panel">
        <h2>Download your data</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          A JSON file with your account details, watchlist, ratings, favourite genres, profile picture, signed-in sessions and
          account activity. Passwords and sign-in tokens are never included.
        </p>
        <form method="post" action="/account/export" style={{ marginTop: 12 }}>
          <button type="submit" className="btn">
            Download my data
          </button>
        </form>
      </section>

      <section className="card-panel danger-zone">
        <h2>Delete account</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          This permanently deletes your account, watchlist, ratings, preferences and profile picture, and signs you out everywhere.
          It can&apos;t be undone.{user.role === "admin" ? " Content Studio drafts, templates and facts you made stay, without your name." : ""}
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
