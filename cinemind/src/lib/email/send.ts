import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export { appUrl } from "@/lib/site";

export function emailConfigured() {
  return Boolean(process.env.SMTP_URL?.trim());
}

let transport: Transporter | null = null;

export type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends an email over SMTP (SMTP_URL, e.g. smtps://user:pass@smtp.example.com:465).
 * Without SMTP in development the message is printed to the server console instead;
 * in production it is not sent and an error is logged.
 */
export async function sendEmail(email: Email) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[email] SMTP_URL is not set; email "${email.subject}" to ${email.to} was not sent.`);
      return false;
    }
    console.log(`[email] (dev, not sent) To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    return true;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL!.trim());
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM?.trim() || "CineMind AI <no-reply@localhost>",
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${email.subject}" to ${email.to}:`, (err as Error).message);
    return false;
  }
}
