import { emailVerificationMode, getCurrentUser } from "@/lib/auth/session";
import { VerifyBannerContent } from "./VerifyBannerContent";

/** Reminds signed-in users with an unconfirmed address to open the confirmation email. */
export async function VerifyBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;
  return <VerifyBannerContent email={user.email} required={emailVerificationMode() === "required"} />;
}
