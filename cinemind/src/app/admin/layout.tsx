import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · CineMind AI" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container studio">
      <div className="studio-head">
        <div>
          <div className="eyebrow">CineMind</div>
          <h1>Admin</h1>
        </div>
        <nav className="studio-nav" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/movies">Movies</Link>
          <Link href="/admin/reviews">Reviews</Link>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/studio/settings">Brand</Link>
          <Link href="/studio/templates">Templates</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
