import type { Metadata } from "next";
import { BrandForm } from "@/components/studio/BrandForm";
import { getBrandSettings } from "@/lib/studio/repository";

export const metadata: Metadata = { title: "Brand settings" };

export default async function BrandSettingsPage() {
  const brand = await getBrandSettings();
  return (
    <>
      <p className="muted" style={{ maxWidth: 720 }}>
        These settings shape every generated post. Existing drafts keep their text until you regenerate them.
      </p>
      <BrandForm brand={brand} />
    </>
  );
}
