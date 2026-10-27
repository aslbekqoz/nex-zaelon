// Minimal, logic-less template renderer (a small subset of Mustache).
//   {{name}}              value (strings and numbers)
//   {{#name}}…{{/name}}   block: shown when the value is present; repeated for each item of a list
//   {{^name}}…{{/name}}   inverted block: shown when the value is missing or an empty list
// Inside a list block, item fields shadow outer ones. Unknown names render as nothing.
// Pure, so the editor preview and the server produce identical output.

export type TemplateValue = string | number | null | undefined | TemplateContext[];
export type TemplateContext = { [key: string]: TemplateValue };

const SECTION = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const VARIABLE = /\{\{\s*([\w.]+)\s*\}\}/g;

function present(v: TemplateValue) {
  if (Array.isArray(v)) return v.length > 0;
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function renderWith(template: string, scopes: TemplateContext[]): string {
  const lookup = (name: string): TemplateValue => {
    for (const s of scopes) if (name in s) return s[name];
    return undefined;
  };
  // Sections first (innermost-last recursion handles nesting of different names)
  const withSections = template.replace(SECTION, (_m, type: string, name: string, inner: string) => {
    const v = lookup(name);
    if (type === "^") return present(v) ? "" : renderWith(inner, scopes);
    if (!present(v)) return "";
    if (Array.isArray(v)) return v.map((item) => renderWith(inner, [item, ...scopes])).join("");
    return renderWith(inner, scopes);
  });
  return withSections.replace(VARIABLE, (_m, name: string) => {
    const v = lookup(name);
    return v === null || v === undefined || Array.isArray(v) ? "" : String(v);
  });
}

/** Removes trailing spaces and runs of blank lines left behind by empty blocks. */
export function tidy(text: string) {
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderTemplate(template: string, context: TemplateContext) {
  return tidy(renderWith(template, [context]));
}

/** Placeholder names used in a template, for validation and the help panel. */
export function placeholders(template: string) {
  return [...new Set([...template.matchAll(/\{\{\s*[#^/]?\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];
}
