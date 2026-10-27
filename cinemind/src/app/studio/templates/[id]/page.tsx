import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateForm } from "@/components/studio/TemplateForm";
import { deleteTemplate } from "@/lib/studio/actions";
import { KINDS, getTemplate } from "@/lib/studio/repository";
import { TemplateHelp } from "@/components/studio/TemplateHelp";
import { sampleContext } from "@/lib/studio/sample";

export const metadata: Metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const template = Number.isSafeInteger(id) && id > 0 ? await getTemplate(id) : null;
  if (!template) notFound();
  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>{template.name}</h2>
        {!template.isDefault ? (
          <form action={deleteTemplate}>
            <input type="hidden" name="id" value={template.id} />
            <button className="btn btn-sm btn-ghost danger">Delete template</button>
          </form>
        ) : null}
      </div>
      <TemplateForm template={template} kind={template.kind} language={template.language} kinds={KINDS} sample={sampleContext(template.language)} />
      <TemplateHelp />
    </>
  );
}
