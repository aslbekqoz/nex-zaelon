// Pure rate-limit decision, unit tested. Counts failures inside the window that happened
// after the most recent success (a successful sign-in resets the counter).

export type Attempt = { success: boolean; at: Date };
export type Limit = { max: number; windowMs: number };

export function evaluateLimit(attempts: Attempt[], now: Date, limit: Limit) {
  const since = now.getTime() - limit.windowMs;
  const recent = attempts.filter((a) => a.at.getTime() > since).sort((a, b) => a.at.getTime() - b.at.getTime());
  const lastSuccess = recent.findLastIndex((a) => a.success);
  const failures = recent.slice(lastSuccess + 1).filter((a) => !a.success);
  if (failures.length < limit.max) return { blocked: false as const, remaining: limit.max - failures.length };
  // Unblocked once enough of the counted failures have aged out of the window
  const unlockAt = failures[failures.length - limit.max].at.getTime() + limit.windowMs;
  return { blocked: true as const, retryAfterMs: Math.max(0, unlockAt - now.getTime()) };
}

/** Counts every attempt (successful or not), for limits such as sign-ups per IP. */
export function evaluateVolume(attempts: Attempt[], now: Date, limit: Limit) {
  const since = now.getTime() - limit.windowMs;
  const recent = attempts.filter((a) => a.at.getTime() > since).sort((a, b) => a.at.getTime() - b.at.getTime());
  if (recent.length < limit.max) return { blocked: false as const, remaining: limit.max - recent.length };
  const unlockAt = recent[recent.length - limit.max].at.getTime() + limit.windowMs;
  return { blocked: true as const, retryAfterMs: Math.max(0, unlockAt - now.getTime()) };
}

export function retryMessage(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
