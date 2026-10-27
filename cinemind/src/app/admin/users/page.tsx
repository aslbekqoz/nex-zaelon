import type { Metadata } from "next";
import { UserActions } from "@/components/admin/UserActions";
import { UserAvatar } from "@/components/UserAvatar";
import { listUsers } from "@/lib/admin/repository";
import { isRole, ROLE_LABELS } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { when } from "../describe";

export const metadata: Metadata = { title: "Users" };

type Props = { searchParams: Promise<{ q?: string; role?: string; status?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  const me = await requireAdmin("/admin/users");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const role = isRole(sp.role) ? sp.role : undefined;
  const status = sp.status === "active" || sp.status === "disabled" || sp.status === "unverified" ? sp.status : undefined;
  // "#123" finds a user by id (used by links from the audit log)
  const byId = q?.match(/^#(\d+)$/)?.[1];
  const users = (await listUsers({ q: byId ? undefined : q, role, status })).filter((u) => !byId || u.id === Number(byId));

  return (
    <>
      <form className="search-form search-form-filters" action="/admin/users">
        <label className="sr-only" htmlFor="q">
          Search users
        </label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Search by name or email…" />
        <select name="role" className="select" defaultValue={role ?? ""} aria-label="Role">
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="editor">Editors</option>
          <option value="user">Users</option>
        </select>
        <select name="status" className="select" defaultValue={status ?? ""} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="unverified">Email unverified</option>
        </select>
        <button className="btn">Filter</button>
      </form>
      <p className="result-info">
        {users.length} user{users.length === 1 ? "" : "s"}
        {users.length === 200 ? " (showing the newest 200)" : ""}
      </p>
      <ul className="draft-list">
        {users.map((u) => (
          <li key={u.id} className={`user-row${u.disabledAt ? " is-disabled" : ""}`}>
            <div className="draft-main">
              <strong className="user-row-name">
                <UserAvatar name={u.name} avatarKey={u.avatarKey} size={32} />
                {u.name} {u.id === me.id ? <span className="faint">(you)</span> : null}
              </strong>
              <span className="faint">{u.email}</span>
              <span className="faint" style={{ fontSize: 13 }}>
                Joined {when(u.createdAt)}
                {u.lastSeenAt ? ` · last sign-in ${when(u.lastSeenAt)}` : ""} · {u.ratings} ratings · {u.watchlist} saved
              </span>
            </div>
            <div className="draft-meta">
              <span className={`badge${u.role === "user" ? "" : " status-ready"}`}>{ROLE_LABELS[u.role]}</span>
              {u.disabledAt ? <span className="badge status-rejected">Disabled</span> : null}
              {!u.emailVerifiedAt ? <span className="badge status-unverified">Email unverified</span> : null}
            </div>
            <UserActions user={u} isSelf={u.id === me.id} />
          </li>
        ))}
      </ul>
    </>
  );
}
