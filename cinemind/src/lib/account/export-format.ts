// Shapes a user's data into the downloadable export. Pure, unit tested.

export type ExportSource = {
  user: {
    name: string;
    email: string;
    role: string;
    createdAt: Date;
    emailVerifiedAt: Date | null;
    onboardedAt: Date | null;
  };
  favouriteGenres: string[];
  watchlist: { movieId: number; title: string; titleUz: string | null; year: number | null; watched: boolean; addedAt: Date }[];
  ratings: { movieId: number; title: string; titleUz: string | null; year: number | null; rating: number; ratedAt: Date }[];
  pendingEmailChange: { newEmail: string; createdAt: Date; expiresAt: Date } | null;
  sessions: { createdAt: Date; expiresAt: Date }[];
  avatar: { contentType: string; updatedAt: Date; image: Uint8Array } | null;
  activity: { action: string; createdAt: Date; details: Record<string, unknown> }[];
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** `base` is the site's public address; without one, movie links stay relative. */
export function buildAccountExport(src: ExportSource, opts: { base: string | null; exportedAt: Date; brand?: string }) {
  const movieUrl = (id: number) => `${opts.base ?? ""}/movies/${id}`;
  return {
    about: `Your personal data from ${opts.brand ?? "CineMind AI"}. Passwords and sign-in tokens are never included.`,
    exportedAt: opts.exportedAt.toISOString(),
    account: {
      name: src.user.name,
      email: src.user.email,
      emailConfirmedAt: iso(src.user.emailVerifiedAt),
      role: src.user.role,
      createdAt: src.user.createdAt.toISOString(),
      onboardedAt: iso(src.user.onboardedAt),
      pendingEmailChange: src.pendingEmailChange
        ? {
            newEmail: src.pendingEmailChange.newEmail,
            requestedAt: src.pendingEmailChange.createdAt.toISOString(),
            expiresAt: src.pendingEmailChange.expiresAt.toISOString(),
          }
        : null,
    },
    favouriteGenres: src.favouriteGenres,
    watchlist: src.watchlist.map((w) => ({
      title: w.title,
      titleUz: w.titleUz,
      year: w.year,
      watched: w.watched,
      addedAt: w.addedAt.toISOString(),
      url: movieUrl(w.movieId),
    })),
    ratings: src.ratings.map((r) => ({
      title: r.title,
      titleUz: r.titleUz,
      year: r.year,
      rating: r.rating,
      ratedAt: r.ratedAt.toISOString(),
      url: movieUrl(r.movieId),
    })),
    profilePicture: src.avatar
      ? {
          contentType: src.avatar.contentType,
          updatedAt: src.avatar.updatedAt.toISOString(),
          dataBase64: Buffer.from(src.avatar.image).toString("base64"),
        }
      : null,
    signedInSessions: src.sessions.map((s) => ({ signedInAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString() })),
    activity: src.activity.map((a) => ({ action: a.action, at: a.createdAt.toISOString(), ...(Object.keys(a.details).length ? { details: a.details } : {}) })),
  };
}

export function exportFilename(at: Date) {
  return `cinemind-data-${at.toISOString().slice(0, 10)}.json`;
}
