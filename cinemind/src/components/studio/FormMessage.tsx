import type { FormState } from "@/lib/studio/actions";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error)
    return (
      <div className="form-error" role="alert">
        {state.error}
      </div>
    );
  if (state.ok)
    return (
      <div className="form-ok" role="status">
        {state.ok}
      </div>
    );
  return null;
}
