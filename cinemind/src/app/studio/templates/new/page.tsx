import type { Metadata } from "next";
import { TemplateForm } from "@/components/studio/TemplateForm";
import { KINDS, getDefaultTemplate } from "@/lib/studio/repository";
import { TemplateHelp } from "@/components/studio/TemplateHelp";
import { sampleContext } from "@/lib/studio/sample";

export const metadata: Metadata = { title: "New template" };

type Props = { searchParams: Promise<{ kind?: string; language?: string }> };

export default async function NewTemplatePage({ searchParams }: Props) {
  const sp = await searchParams;
  const kind = KINDS.find((k) => k.value === sp.kind)?.value ?? "movie_card";
  const language = sp.language === "en" ? "en" : "uz";
  // Start from the current default so editors adapt rather than write from scratch
  const base = await getDefaultTemplate(kind, language);
  return (
    <>
      <h2 style={{ margin: "8px 0 16px" }}>New template</h2>
      <TemplateForm
        key={`${kind}-${language}`}
        template={base ? { ...base, id: 0, name: `${base.name} (custom)`, isDefault: false } : undefined}
        kind={kind}
        language={language}
        kinds={KINDS}
        sample={sampleContext(language)}
      />
      <TemplateHelp />
    </>
  );
}
