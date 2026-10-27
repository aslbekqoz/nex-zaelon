import { toHtml, toMarkdown, toPlainText } from "@/lib/studio/format";

export type CopyFormat = "plain" | "markdown" | "rich";

function legacyCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

/** Copies a draft body to the clipboard. "rich" puts HTML (bold, italics, links) plus a plain fallback. */
export async function copyBody(body: string, format: CopyFormat) {
  const plain = toPlainText(body);
  try {
    if (format === "rich" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([toHtml(body)], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
    const text = format === "markdown" ? toMarkdown(body) : plain;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return legacyCopy(text);
  } catch {
    return legacyCopy(format === "markdown" ? toMarkdown(body) : plain);
  }
}
