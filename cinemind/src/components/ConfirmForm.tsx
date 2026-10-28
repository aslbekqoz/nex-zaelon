"use client";

/** A server-action form that asks the browser to confirm before submitting. */
export function ConfirmForm({ action, message, children, className, style }: { action: (form: FormData) => void | Promise<void>; message: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <form
      action={action}
      className={className}
      style={style}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
