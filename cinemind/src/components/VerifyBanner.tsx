import { getCurrentUser } from "@/lib/auth/session";
import { ResendVerification } from "./ResendVerification";

/** Reminds signed-in users with an unconfirmed address to open the confirmation email. */
export async function VerifyBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;
  return (
    <div className="verify-banner" role="status">
      <div className="container verify-inner">
        <span>
          📧 Please confirm your email address <strong>{user.email}</strong> — we sent you a link.
        </span>
        <ResendVerification />
      </div>
    </div>
  );
}
