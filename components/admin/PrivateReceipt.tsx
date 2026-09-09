"use client";
import { useState, useTransition } from "react";
import { loadPrivateReceipt } from "@/app/admin/orders/receipt";
export function PrivateReceipt({ orderId }: { orderId: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-5">
      {url ? (
        <a className="admin-btn" href={url} target="_blank" rel="noreferrer">
          View private receipt ↗
        </a>
      ) : (
        <button
          type="button"
          className="admin-btn"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(false);
              try {
                setUrl(await loadPrivateReceipt(orderId));
              } catch {
                setError(true);
              }
            })
          }
        >
          {pending ? "Loading receipt…" : "Load private receipt"}
        </button>
      )}
      {error && (
        <p role="alert" className="admin-muted mt-2">
          Receipt unavailable. Please try again.
        </p>
      )}
    </div>
  );
}
