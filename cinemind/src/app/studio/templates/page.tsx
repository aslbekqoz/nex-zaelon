import type { Metadata } from "next";
import Link from "next/link";
import { TemplateHelp } from "@/components/studio/TemplateHelp";
import { KINDS, listTemplates } from "@/lib/studio/repository";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>Templates</h2>
        <Link href="/studio/templates/new" className="btn btn-sm btn-primary">
          + New template
        </Link>
      </div>
      {KINDS.map((k) => (
        <section key={k.value} className="onboard-section">
          <h3>{k.label}</h3>
          <ul className="draft-list">
            {templates
              .filter((t) => t.kind === k.value)
              .map((t) => (
                <li key={t.id}>
                  <Link href={`/studio/templates/${t.id}`} className="draft-row">
                    <div className="draft-main">
                      <strong>{t.name}</strong>
                      <span className="faint mono">{t.body.split("\n")[0].slice(0, 90)}</span>
                    </div>
                    <div className="draft-meta">
                      <span className="badge">{t.language.toUpperCase()}</span>
                      {t.isDefault ? <span className="badge status-ready">Default</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <TemplateHelp />
    </>
  );
}
