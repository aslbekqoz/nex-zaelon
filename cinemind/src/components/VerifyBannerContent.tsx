"use client";

import { usePathname } from "next/navigation";
import { ResendVerification } from "./ResendVerification";

// Pages that already explain the confirmation step don't need the banner too
const HIDDEN_ON = ["/confirm-email", "/verify-email"];

export function VerifyBannerContent({ email, required }: { email: string; required: boolean }) {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;
  return (
    <div className="verify-banner" role="status">
      <div className="container verify-inner">
        <span>
          📧 {required ? "Confirm your email to use your watchlist, ratings and recommendations." : "Please confirm your email address."}{" "}
          We sent a link to <strong>{email}</strong>.
        </span>
        <ResendVerification />
      </div>
    </div>
  );
}
