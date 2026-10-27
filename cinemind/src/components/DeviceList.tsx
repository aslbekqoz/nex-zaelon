import { signOutDevice, signOutOtherDevices } from "@/lib/auth/actions";
import { describeDevice } from "@/lib/auth/device";
import type { DeviceSession } from "@/lib/auth/session";
import { SubmitButton } from "./SubmitButton";

function ago(date: Date, now: number) {
  const minutes = Math.round((now - date.getTime()) / 60000);
  if (minutes < 10) return "active now";
  if (minutes < 60) return `active ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `active ${days} day${days === 1 ? "" : "s"} ago`;
}

function day(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DeviceList({ sessions, now }: { sessions: DeviceSession[]; now: number }) {
  const others = sessions.filter((s) => !s.current).length;
  return (
    <>
      <ul className="device-list">
        {sessions.map((s) => (
          <li key={s.id}>
            <div className="device-info">
              <strong>{describeDevice(s.userAgent)}</strong>
              {s.current ? <span className="badge status-ready">This device</span> : null}
              <div className="faint device-meta">
                Signed in {day(s.createdAt)} · {s.current ? "active now" : ago(s.lastSeenAt, now)}
              </div>
            </div>
            {s.current ? null : (
              <form action={signOutDevice}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton className="btn btn-sm" pendingText="…">
                  Sign out
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      {others > 1 ? (
        <form action={signOutOtherDevices} style={{ marginTop: 12 }}>
          <SubmitButton className="btn btn-sm" pendingText="Signing out…">
            Sign out all other devices
          </SubmitButton>
        </form>
      ) : null}
    </>
  );
}
