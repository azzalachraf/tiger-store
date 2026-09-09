"use client";
import { useState } from "react";
import Link from "next/link";
import {
  renameTelegramAdminAction,
  disableTelegramAdminAction,
} from "@/app/admin/team/actions";
import { ActionForm } from "./ActionForm";
export type TeamMemberView = {
  id: string;
  name: string;
  username: string;
  role: "pending" | "admin" | "owner";
  active: number;
};
export function TeamWorkspace({ members }: { members: TeamMemberView[] }) {
  const [query, setQuery] = useState("");
  const [access, setAccess] = useState("all");
  const rows = members.filter(
    (m) =>
      (m.name + " " + m.username)
        .toLowerCase()
        .includes(query.toLowerCase().trim()) &&
      (access === "all" ||
        (access === "active" ? m.role !== "pending" : m.role === "pending")),
  );
  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-search">
          Find team member
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or Telegram username"
          />
        </label>
        <label>
          Access
          <select value={access} onChange={(e) => setAccess(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="active">Owner & active admins</option>
            <option value="pending">No admin access</option>
          </select>
        </label>
      </div>
      <p className="admin-muted mb-5">
        Disabling removes bot admin access, not their history or credit.
        Re-approve through the owner’s existing Telegram menu. Owners are
        protected.
      </p>
      <div className="grid gap-4">
        {rows.map((m) => (
          <article className="admin-panel" key={m.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="admin-panel-title" dir="auto">
                  {m.name || m.username || "Unnamed user"}
                </h2>
                <p className="admin-muted">
                  {m.username ? "@" + m.username : "No username"} ·{" "}
                  {m.role === "pending" ? "No admin access" : m.role} ·{" "}
                  {m.active} active operations
                </p>
              </div>
              {m.role !== "owner" && (
                <Link
                  className="admin-btn"
                  href={"/admin/team/" + encodeURIComponent(m.id)}
                >
                  Client sheet
                </Link>
              )}
            </div>
            {m.role !== "pending" && (
              <div className="mt-4 flex flex-wrap gap-3 items-start">
                <ActionForm
                  action={renameTelegramAdminAction}
                  className="flex flex-wrap gap-2 flex-1"
                >
                  <input type="hidden" name="telegramUserId" value={m.id} />
                  <label className="grid gap-1 flex-1">
                    Display name
                    <input
                      name="displayName"
                      required
                      maxLength={80}
                      defaultValue={m.name}
                      dir="auto"
                    />
                  </label>
                  <button className="admin-btn self-end">Save name</button>
                </ActionForm>
                {m.role === "admin" && (
                  <ActionForm
                    action={disableTelegramAdminAction}
                    confirmation={
                      "Disable " +
                      (m.name || m.username) +
                      "? Bot admin access will be removed. Orders, stock history and credit will be retained. Re-approval is required to return."
                    }
                    className="self-end"
                  >
                    <input type="hidden" name="telegramUserId" value={m.id} />
                    <button
                      disabled={m.active > 0}
                      title={
                        m.active > 0
                          ? "Finish or cancel active operations first"
                          : undefined
                      }
                      className="admin-btn admin-btn-danger"
                    >
                      Disable access
                    </button>
                  </ActionForm>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!rows.length && <p className="admin-empty">No team members match.</p>}
    </>
  );
}
