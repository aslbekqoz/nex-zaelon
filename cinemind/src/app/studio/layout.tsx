import type { Metadata } from "next";
import Link from "next/link";
import { requireEditor } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Content Studio", template: "%s · Studio · CineMind AI" } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireEditor();
  return (
    <div className="container studio">
      <div className="studio-head">
        <div>
          <div className="eyebrow">CineMind</div>
          <h1>Content Studio</h1>
        </div>
        <nav className="studio-nav" aria-label="Studio">
          <Link href="/studio">Drafts</Link>
          <Link href="/studio/new">New draft</Link>
          <Link href="/studio/facts">Facts</Link>
          <Link href="/studio/templates">Templates</Link>
          <Link href="/studio/settings">Brand</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
