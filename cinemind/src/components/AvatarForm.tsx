"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { removeAvatar, uploadAvatar } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

export function AvatarForm({ hasAvatar }: { hasAvatar: boolean }) {
  const [uploadState, upload] = useActionState(uploadAvatar, {});
  const [removeState, remove] = useActionState(removeAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  // Which form was submitted last, so its message wins over the other one's stale result
  const [last, setLast] = useState<"upload" | "remove">("upload");
  const uploadForm = useRef<HTMLFormElement>(null);

  // Free the preview's object URL when it changes or the form goes away
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  // After a successful upload the page shows the saved picture, so drop the local preview and the chosen file
  useEffect(() => {
    if (!uploadState.ok) return;
    uploadForm.current?.reset();
    setPreview(null);
  }, [uploadState]);

  const message = clientError ? { error: clientError } : last === "upload" ? uploadState : removeState;

  return (
    <div className="avatar-form">
      <ActionForm action={upload} ref={uploadForm} onSubmit={() => setLast("upload")} className="tool-row">
        <label className="btn btn-sm">
          Choose picture
          <input
            type="file"
            name="avatar"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              setClientError(null);
              if (!file) return setPreview(null);
              if (file.size > MAX_BYTES) {
                e.currentTarget.value = "";
                setPreview(null);
                return setClientError("The picture is larger than 5 MB.");
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
        </label>
        {preview ? (
          <>
            <img src={preview} alt="Preview of the new picture" className="user-avatar avatar-preview" width={56} height={56} />
            <SubmitButton className="btn btn-sm btn-primary" pendingText="Uploading…">
              Save picture
            </SubmitButton>
          </>
        ) : null}
      </ActionForm>
      {hasAvatar && !preview ? (
        <form action={remove} onSubmit={() => setLast("remove")}>
          <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
            Remove picture
          </SubmitButton>
        </form>
      ) : null}
      {message.error ? (
        <div className="form-error" role="alert">
          {message.error}
        </div>
      ) : message.ok ? (
        <div className="form-ok" role="status">
          {message.ok}
        </div>
      ) : null}
      <p className="faint" style={{ fontSize: 13, margin: 0 }}>
        JPEG, PNG, WebP, AVIF or GIF up to 5 MB. We crop it to a square and remove hidden data such as location.
      </p>
    </div>
  );
}
