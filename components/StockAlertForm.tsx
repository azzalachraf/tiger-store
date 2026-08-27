"use client";

import { FormEvent, useState } from "react";

export function StockAlertForm({ productSlug, optionId }: { productSlug: string; optionId?: string }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/stock-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productSlug, optionId, phone }),
    });
    const body: unknown = await response.json();
    const error = typeof body === "object" && body && "error" in body ? String(body.error) : "";
    setMessage(response.ok ? "We will contact you if this offer becomes available." : error || "Unable to save your request.");
  }

  return <form onSubmit={submit} className="mt-4 grid gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--page)] p-3 text-[var(--text)]">
    <label className="text-sm font-bold text-black" htmlFor={`stock-alert-${productSlug}`}>Get an availability alert</label>
    <div className="flex gap-2"><input id={`stock-alert-${productSlug}`} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="0550 123 456" required className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[var(--text)]" /><button type="submit" className="min-h-11 rounded-lg bg-[#151515] px-3 text-sm font-bold text-[#FFF8F1]">Notify me</button></div>
    {message ? <p role="status" className="text-xs font-semibold text-[var(--muted-text)]">{message}</p> : null}
  </form>;
}
