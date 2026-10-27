// Draft bodies use a tiny markup: **bold**, _italic_ and bare URLs. These formatters turn a
// body into the three copy formats offered by the editor. Pure, shared by client and server.

const BOLD = /\*\*(.+?)\*\*/g;
const ITALIC = /(^|[\s(«"'])_(?!\s)(.+?)(?<!\s)_(?=$|[\s.,;:!?)»"'])/gm;
const URL_RE = /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»]/g;

export function toPlainText(body: string) {
  return body.replace(BOLD, "$1").replace(ITALIC, "$1$2");
}

/** Markup is already Markdown-compatible; normalise italics to *x* for wider support. */
export function toMarkdown(body: string) {
  return body.replace(ITALIC, "$1*$2*");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function toHtml(body: string) {
  return escapeHtml(body)
    .replace(URL_RE, (url) => `<a href="${url}">${url}</a>`)
    .replace(BOLD, "<b>$1</b>")
    .replace(ITALIC, "$1<i>$2</i>")
    .replace(/\n/g, "<br>\n");
}
