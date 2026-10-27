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

export function verifyEmailMessage(input: { name: string; link: string; hours: number; brand?: string }) {
  const brand = input.brand ?? "CineMind AI";
  const subject = `Confirm your email for ${brand}`;
  const text = [
    `Hi ${input.name},`,
    "",
    `Welcome to ${brand}! Please confirm that this is your email address by opening this link:`,
    "",
    input.link,
    "",
    `The link works once and expires in ${input.hours} hours.`,
    `If you didn't create a ${brand} account, you can ignore this email.`,
    "",
    `— ${brand}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
<p>Hi ${escapeHtml(input.name)},</p>
<p>Welcome to ${escapeHtml(brand)}! Please confirm that this is your email address.</p>
<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#f5b301;color:#1a1300;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Confirm my email</a></p>
<p style="font-size:14px;color:#555">Or copy this link: ${escapeHtml(input.link)}</p>
<p style="font-size:14px;color:#555">The link works once and expires in ${input.hours} hours. If you didn't create a ${escapeHtml(brand)} account, you can ignore this email.</p>
<p>— ${escapeHtml(brand)}</p>
</body></html>`;
  return { subject, text, html };
}

function wrap(paragraphs: string[]) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
${paragraphs.join("\n")}
</body></html>`;
}

/** Sent to the NEW address: confirming it completes the change. */
export function emailChangeConfirmMessage(input: { name: string; newEmail: string; link: string; hours: number; brand?: string }) {
  const brand = input.brand ?? "CineMind AI";
  const subject = `Confirm your new email for ${brand}`;
  const text = [
    `Hi ${input.name},`,
    "",
    `You asked to use ${input.newEmail} for your ${brand} account. To confirm this address and complete the change, open this link:`,
    "",
    input.link,
    "",
    `The link works once and expires in ${input.hours} hours. Until then your account keeps its current address.`,
    "If you didn't ask for this, ignore this email and nothing will change.",
    "",
    `— ${brand}`,
  ].join("\n");
  const html = wrap([
    `<p>Hi ${escapeHtml(input.name)},</p>`,
    `<p>You asked to use <strong>${escapeHtml(input.newEmail)}</strong> for your ${escapeHtml(brand)} account. Confirm this address to complete the change.</p>`,
    `<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#f5b301;color:#1a1300;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Confirm new email</a></p>`,
    `<p style="font-size:14px;color:#555">Or copy this link: ${escapeHtml(input.link)}</p>`,
    `<p style="font-size:14px;color:#555">The link works once and expires in ${input.hours} hours. Until then your account keeps its current address. If you didn't ask for this, ignore this email and nothing will change.</p>`,
    `<p>— ${escapeHtml(brand)}</p>`,
  ]);
  return { subject, text, html };
}

/** Security notices sent to the OLD address when a change is requested and when it completes. */
export function emailChangeNotice(input: { name: string; maskedNewEmail: string; stage: "requested" | "completed"; resetUrl: string; brand?: string }) {
  const brand = input.brand ?? "CineMind AI";
  const requested = input.stage === "requested";
  const subject = requested ? `Email change requested for your ${brand} account` : `Your ${brand} email address was changed`;
  const lead = requested
    ? `Someone signed in to your ${brand} account asked to change its email to ${input.maskedNewEmail}. The change only happens once that new address is confirmed.`
    : `The email address on your ${brand} account was changed to ${input.maskedNewEmail}. Future emails will go to the new address.`;
  const advice = `If this wasn't you, reset your password straight away: ${input.resetUrl}`;
  const text = [`Hi ${input.name},`, "", lead, "", advice, "", `— ${brand}`].join("\n");
  const html = wrap([
    `<p>Hi ${escapeHtml(input.name)},</p>`,
    `<p>${escapeHtml(lead)}</p>`,
    `<p>If this wasn't you, <a href="${escapeHtml(input.resetUrl)}">reset your password</a> straight away.</p>`,
    `<p>— ${escapeHtml(brand)}</p>`,
  ]);
  return { subject, text, html };
}
