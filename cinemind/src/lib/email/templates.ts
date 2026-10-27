// Email bodies. Pure, unit tested.

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function passwordResetEmail(input: { name: string; link: string; minutes: number; brand?: string }) {
  const brand = input.brand ?? "CineMind AI";
  const validFor = input.minutes >= 120 ? `${Math.round(input.minutes / 60)} hours` : `${input.minutes} minutes`;
  const subject = `Reset your ${brand} password`;
  const text = [
    `Hi ${input.name},`,
    "",
    `Someone asked to reset the password for your ${brand} account. To choose a new password, open this link:`,
    "",
    input.link,
    "",
    `The link works once and expires in ${validFor}.`,
    "If you didn't ask for this, you can ignore this email — your password stays the same.",
    "",
    `— ${brand}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
<p>Hi ${escapeHtml(input.name)},</p>
<p>Someone asked to reset the password for your ${escapeHtml(brand)} account. To choose a new password, use the button below.</p>
<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#f5b301;color:#1a1300;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
<p style="font-size:14px;color:#555">Or copy this link: ${escapeHtml(input.link)}</p>
<p style="font-size:14px;color:#555">The link works once and expires in ${validFor}. If you didn't ask for this, you can ignore this email — your password stays the same.</p>
<p>— ${escapeHtml(brand)}</p>
</body></html>`;
  return { subject, text, html };
}
