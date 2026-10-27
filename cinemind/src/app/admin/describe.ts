// Human-readable labels for audit actions
const LABELS: Record<string, string> = {
  "auth.logout": "signed out",
  "user.promote": "made a user admin",
  "user.demote": "removed admin rights",
  "user.disable": "disabled an account",
  "user.enable": "enabled an account",
  "user.sessions_revoked": "signed a user out everywhere",
  "user.promote_cli": "was made admin from the command line",
  "movie.create": "added a movie",
  "movie.update": "edited a movie",
  "movie.delete": "deleted a movie",
  "movie.import": "imported movies from TMDB",
  "draft.create": "created a draft",
  "draft.ai_write": "used AI on a draft",
  "draft.delete": "deleted a draft",
  "template.create": "created a template",
  "template.update": "edited a template",
  "template.delete": "deleted a template",
  "fact.create": "added a fact",
  "fact.verify": "verified a fact",
  "fact.reject": "rejected a fact",
  "fact.reset": "reset a fact to unverified",
  "fact.delete": "deleted a fact",
  "brand.update": "changed brand settings",
};

export function describeAction(action: string) {
  return LABELS[action] ?? action;
}

export function targetHref(type: string | null, id: string | null) {
  if (!type || !id) return null;
  switch (type) {
    case "movie":
      return `/admin/movies/${id}`;
    case "draft":
      return `/studio/drafts/${id}`;
    case "template":
      return `/studio/templates/${id}`;
    case "brand":
      return "/studio/settings";
    case "fact":
      return "/studio/facts";
    case "user":
      return `/admin/users?q=%23${id}`;
    default:
      return null;
  }
}

export function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
