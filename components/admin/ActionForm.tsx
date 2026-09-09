"use client";
import { useRef, useState, useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
type Props = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (data: FormData) => void | Promise<void>;
  confirmation?: string;
  successMessage?: string;
  validate?: (data: FormData) => string | null;
};
export function ActionForm({
  action,
  confirmation,
  validate,
  successMessage = "Changes saved.",
  children,
  ...props
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const queued = useRef<FormData | null>(null);
  function submit(data: FormData) {
    const validation = validate?.(data);
    if (validation) {
      setFailed(true);
      setMessage(validation);
      return;
    }
    setMessage("");
    setFailed(false);
    startTransition(async () => {
      try {
        await action(data);
        setMessage(successMessage);
        router.refresh();
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "digest" in error &&
          String(error.digest).startsWith("NEXT_REDIRECT")
        )
          throw error;
        setFailed(true);
        setMessage(
          "Could not save this change. Check the fields and your connection, then retry. Your entries are still here.",
        );
      }
    });
  }
  return (
    <>
      <form
        {...props}
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const data = new FormData(event.currentTarget);
          if (submitter instanceof HTMLButtonElement && submitter.name)
            data.set(submitter.name, submitter.value);
          if (confirmation) {
            queued.current = data;
            dialog.current?.showModal();
          } else submit(data);
        }}
      >
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
        {pending && (
          <p role="status" className="admin-muted">
            Saving…
          </p>
        )}
        {message && (
          <p
            role={failed ? "alert" : "status"}
            className="admin-feedback"
            data-error={failed}
          >
            {message}
          </p>
        )}
      </form>
      {confirmation && (
        <dialog ref={dialog} className="admin-dialog">
          <h2>Confirm action</h2>
          <p>{confirmation}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="admin-btn"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => {
                dialog.current?.close();
                if (queued.current) submit(queued.current);
              }}
            >
              Confirm
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
