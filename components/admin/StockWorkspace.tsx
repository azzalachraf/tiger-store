"use client";
import { useState } from "react";
import {
  cardLabel,
  snapchatCardTypes,
  type SnapchatCardType,
} from "@/lib/snapchat-card-mapping";
import {
  addRedeemCardsAction,
  markRedeemCardUsedAction,
  removeRedeemCardAction,
  restoreRedeemCardAction,
} from "@/app/admin/card-stock/actions";
import { ActionForm } from "./ActionForm";
import { Pagination, StatusBadge } from "./TableControls";
export type StockCard = {
  id: string;
  type: SnapchatCardType;
  code: string;
  status: string;
  mutable: boolean;
  canRestore: boolean;
};
export function StockWorkspace({ cards }: { cards: StockCard[] }) {
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState("available");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [uploadType, setUploadType] = useState<SnapchatCardType>("try_24");
  const rows = cards.filter(
    (c) =>
      (type === "all" || c.type === type) &&
      (status === "all" || c.status === status) &&
      (c.code + " " + c.id).toLowerCase().includes(query.toLowerCase().trim()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return (
    <>
      <div className="admin-metrics">
        {[
          ["All cards", cards.length],
          ["Available", cards.filter((c) => c.mutable).length],
          ["Reserved", cards.filter((c) => c.status === "reserved").length],
          ["Used", cards.filter((c) => c.status === "consumed").length],
        ].map(([label, count]) => (
          <div className="admin-metric" key={label}>
            <p className="admin-muted">{label}</p>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <details className="admin-panel mb-5">
        <summary className="admin-panel-title">Upload cards</summary>
        <ActionForm
          action={addRedeemCardsAction}
          className="mt-4 grid gap-3"
          successMessage="Cards uploaded. Existing stock has been refreshed."
        >
          <label className="grid gap-2">
            Card type
            <select
              name="cardType"
              value={uploadType}
              onChange={(e) =>
                setUploadType(e.target.value as SnapchatCardType)
              }
            >
              {snapchatCardTypes.map((t) => (
                <option key={t} value={t}>
                  {cardLabel(t, "en")}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            Codes or Apple redemption links
            <textarea
              name="codes"
              required
              rows={4}
              maxLength={52000}
              placeholder="Paste 1–100 entries, one per line"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="admin-btn admin-btn-primary justify-self-start">
            Add to stock
          </button>
        </ActionForm>
      </details>
      <div className="admin-toolbar">
        <label>
          Card type
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All card types</option>
            {snapchatCardTypes.map((t) => (
              <option key={t} value={t}>
                {cardLabel(t, "en")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {[
              ["all", "All statuses"],
              ["available", "Available"],
              ["reserved", "Reserved"],
              ["consumed", "Used"],
              ["disabled", "Disabled"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-search">
          Find card
          <input
            type="search"
            value={query}
            placeholder="Full code or card reference"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <p className="admin-muted mb-3">
        Private codes. Reserved cards and cards consumed by completed orders
        cannot be changed here.
      </p>
      <div className="grid gap-3">
        {rows.slice((current - 1) * size, current * size).map((c) => (
          <article key={c.id} className="admin-panel">
            <div className="flex items-center justify-between gap-3 mb-3">
              <b>{cardLabel(c.type, "en")}</b>
              <StatusBadge
                status={c.status === "consumed" ? "used" : c.status}
              />
            </div>
            <p className="font-mono break-all select-all" dir="ltr">
              {c.code}
            </p>
            <p className="admin-muted mt-2">
              Card {c.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {c.mutable && (
                <>
                  <ActionForm
                    action={markRedeemCardUsedAction}
                    confirmation="Mark this available card as used? It will no longer be assigned by the bot."
                  >
                    <input type="hidden" name="cardId" value={c.id} />
                    <button className="admin-btn">Mark used</button>
                  </ActionForm>
                  <ActionForm
                    action={removeRedeemCardAction}
                    confirmation="Remove this available card from stock? This cannot be undone."
                  >
                    <input type="hidden" name="cardId" value={c.id} />
                    <button className="admin-btn admin-btn-danger">
                      Remove
                    </button>
                  </ActionForm>
                </>
              )}
              {c.canRestore && (
                <ActionForm
                  action={restoreRedeemCardAction}
                  confirmation="Return this manually used card to available stock? Only restore it if it was not redeemed."
                >
                  <input type="hidden" name="cardId" value={c.id} />
                  <button className="admin-btn">Restore to stock</button>
                </ActionForm>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="admin-empty">No cards match these filters.</p>
      )}
      <Pagination
        page={current}
        count={rows.length}
        size={size}
        onPage={setPage}
        onSize={(n) => {
          setSize(n);
          setPage(1);
        }}
      />
    </>
  );
}
