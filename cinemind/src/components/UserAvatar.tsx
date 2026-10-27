import { initials } from "./PersonCard";

/** A user's profile picture, or their initials on a coloured circle when they have none. */
export function UserAvatar({ name, avatarKey, size = 32 }: { name: string; avatarKey: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (avatarKey) {
    return <img src={`/avatars/${avatarKey}`} alt="" width={size} height={size} className="user-avatar" style={style} />;
  }
  return (
    <span className="user-avatar user-avatar-initials" style={style} aria-hidden>
      {initials(name)}
    </span>
  );
}
