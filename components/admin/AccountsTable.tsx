"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState, useTransition } from "react";
import { ArrowDownUp, Download, Eye, EyeOff, FileUp, Plus, Save, Search, Trash2 } from "lucide-react";
import { deleteAccountAction, importAccountsAction, saveAccountAction } from "@/app/admin/accounts/actions";
import { AdminAccount, AdminAccountStatus } from "@/lib/types";

const statuses: AdminAccountStatus[] = ["Available", "Sold", "Expired", "Problem"];
const today = new Date().toISOString().slice(0, 10);

type SortKey = "date-desc" | "date-asc" | "price-desc" | "price-asc";

type DraftAccount = Omit<AdminAccount, "updatedAt"> & {
  updatedAt?: string;
};

export function AccountsTable({ accounts }: { accounts: AdminAccount[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, DraftAccount>>(() =>
    Object.fromEntries(accounts.map((account) => [account.id, account])),
  );
  const [newAccount, setNewAccount] = useState<DraftAccount>(emptyAccount());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | AdminAccountStatus>("All");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => {
    return accounts
      .map((account) => drafts[account.id] ?? account)
      .filter((account) => account.email.toLowerCase().includes(query.toLowerCase().trim()))
      .filter((account) => status === "All" || account.status === status)
      .sort((a, b) => {
        if (sort === "date-asc") return a.dateCreated.localeCompare(b.dateCreated);
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "price-asc") return a.price - b.price;
        return b.dateCreated.localeCompare(a.dateCreated);
      });
  }, [accounts, drafts, query, sort, status]);

  function updateDraft(id: string, key: keyof DraftAccount, value: string | number) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  }

  function updateNew(key: keyof DraftAccount, value: string | number) {
    setNewAccount((current) => ({ ...current, [key]: value }));
  }

  function submitAccount(account: DraftAccount) {
    const formData = accountFormData(account);
    startTransition(() => {
      void saveAccountAction(formData).then(() => router.refresh());
    });
  }

  function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newAccount.email.trim()) return;

    submitAccount(newAccount);
    setNewAccount(emptyAccount());
  }

  function deleteRow(id: string) {
    if (!window.confirm("Delete this account row permanently?")) return;

    const formData = new FormData();
    formData.set("id", id);
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    startTransition(() => {
      void deleteAccountAction(formData).then(() => router.refresh());
    });
  }

  function exportCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tiger-store-accounts-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const imported = parseCsv(await file.text());
    if (!imported.length) return;

    const formData = new FormData();
    formData.set("accounts", JSON.stringify(imported));
    startTransition(() => {
      void importAccountsAction(formData).then(() => router.refresh());
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-tiger-ember/25 bg-[#101010] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)] lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tiger-gold" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email"
            className="min-h-11 w-full rounded-md border border-white/10 bg-black pl-10 pr-3 text-sm text-white outline-none focus:border-tiger-ember"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as "All" | AdminAccountStatus)} className="min-h-11 rounded-md border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-tiger-ember">
          <option value="All">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="min-h-11 rounded-md border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-tiger-ember">
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="price-desc">Highest price</option>
          <option value="price-asc">Lowest price</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.08] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
            <Download className="h-4 w-4 text-tiger-gold" />
            CSV
          </button>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-tiger-ember px-3 text-sm font-black text-black hover:bg-tiger-gold">
            <FileUp className="h-4 w-4" />
            Import
            <input type="file" accept=".csv,text/csv" onChange={importCsv} className="sr-only" />
          </label>
        </div>
      </div>

      <form onSubmit={addAccount} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-3 md:grid-cols-[1.2fr_1fr_1fr_150px_130px_1fr_140px_auto]">
        <SheetInput value={newAccount.email} onChange={(value) => updateNew("email", value)} placeholder="Email" type="email" />
        <SheetPassword value={newAccount.emailPassword} onChange={(value) => updateNew("emailPassword", value)} visible={visible.newEmail} onToggle={() => setVisible((current) => ({ ...current, newEmail: !current.newEmail }))} placeholder="Email password" />
        <SheetPassword value={newAccount.chatgptPassword} onChange={(value) => updateNew("chatgptPassword", value)} visible={visible.newChatgpt} onToggle={() => setVisible((current) => ({ ...current, newChatgpt: !current.newChatgpt }))} placeholder="ChatGPT password" />
        <SheetInput value={newAccount.dateCreated} onChange={(value) => updateNew("dateCreated", value)} type="date" />
        <SheetInput value={String(newAccount.price)} onChange={(value) => updateNew("price", Number(value))} type="number" placeholder="DA" />
        <SheetInput value={newAccount.notes ?? ""} onChange={(value) => updateNew("notes", value)} placeholder="Notes" />
        <StatusSelect value={newAccount.status} onChange={(value) => updateNew("status", value)} />
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-tiger-ember px-4 text-sm font-black text-black hover:bg-tiger-gold disabled:opacity-60">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#0c0c0c]">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#15110d] text-xs uppercase tracking-[0.08em] text-tiger-gold">
            <tr>
              <Th>Email</Th>
              <Th>Email Password</Th>
              <Th>ChatGPT Password</Th>
              <Th>Date Created <ArrowDownUp className="inline h-3.5 w-3.5" /></Th>
              <Th>Price (DA)</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.id} className="border-t border-white/8 odd:bg-white/[0.025] hover:bg-tiger-ember/[0.06]">
                <Td><SheetInput value={account.email} onChange={(value) => updateDraft(account.id, "email", value)} type="email" /></Td>
                <Td><SheetPassword value={account.emailPassword} onChange={(value) => updateDraft(account.id, "emailPassword", value)} visible={visible[`${account.id}-email`]} onToggle={() => setVisible((current) => ({ ...current, [`${account.id}-email`]: !current[`${account.id}-email`] }))} /></Td>
                <Td><SheetPassword value={account.chatgptPassword} onChange={(value) => updateDraft(account.id, "chatgptPassword", value)} visible={visible[`${account.id}-chatgpt`]} onToggle={() => setVisible((current) => ({ ...current, [`${account.id}-chatgpt`]: !current[`${account.id}-chatgpt`] }))} /></Td>
                <Td><SheetInput value={account.dateCreated} onChange={(value) => updateDraft(account.id, "dateCreated", value)} type="date" /></Td>
                <Td><SheetInput value={String(account.price)} onChange={(value) => updateDraft(account.id, "price", Number(value))} type="number" /></Td>
                <Td><SheetInput value={account.notes ?? ""} onChange={(value) => updateDraft(account.id, "notes", value)} /></Td>
                <Td><StatusSelect value={account.status} onChange={(value) => updateDraft(account.id, "status", value)} /></Td>
                <Td>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => submitAccount(account)} disabled={isPending} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-tiger-ember/30 bg-tiger-ember/15 text-tiger-gold hover:bg-tiger-ember/25" aria-label="Save row">
                      <Save className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteRow(account.id)} disabled={isPending} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20" aria-label="Delete row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <div className="border-t border-white/10 p-8 text-center text-sm font-bold text-white/52">
            No accounts match the current view.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function emptyAccount(): DraftAccount {
  return {
    id: "",
    email: "",
    emailPassword: "",
    chatgptPassword: "",
    dateCreated: today,
    price: 0,
    notes: "",
    status: "Available",
  };
}

function accountFormData(account: DraftAccount) {
  const formData = new FormData();
  formData.set("id", account.id);
  formData.set("email", account.email);
  formData.set("emailPassword", account.emailPassword);
  formData.set("chatgptPassword", account.chatgptPassword);
  formData.set("dateCreated", account.dateCreated);
  formData.set("price", String(account.price));
  formData.set("notes", account.notes ?? "");
  formData.set("status", account.status);
  return formData;
}

function SheetInput({ value, onChange, type = "text", placeholder }: { value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      placeholder={placeholder}
      className="min-h-10 w-full rounded-md border border-white/10 bg-black/70 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-tiger-ember"
    />
  );
}

function SheetPassword({ value, onChange, visible, onToggle, placeholder }: { value: string; onChange: (value: string) => void; visible?: boolean; onToggle: () => void; placeholder?: string }) {
  return (
    <div className="flex min-w-0 rounded-md border border-white/10 bg-black/70 focus-within:border-tiger-ember">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="min-h-10 min-w-0 flex-1 rounded-l-md bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30"
      />
      <button type="button" onClick={onToggle} className="inline-flex h-10 w-10 items-center justify-center text-white/60 hover:text-tiger-gold" aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: AdminAccountStatus; onChange: (value: AdminAccountStatus) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as AdminAccountStatus)} className="min-h-10 w-full rounded-md border border-white/10 bg-black/70 px-3 text-sm font-bold text-white outline-none focus:border-tiger-ember">
      {statuses.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap border-r border-white/8 px-3 py-3 font-black last:border-r-0">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="border-r border-white/8 px-2 py-2 align-middle last:border-r-0">{children}</td>;
}

function toCsv(accounts: DraftAccount[]) {
  const header = ["Email", "Email Password", "ChatGPT Password", "Date Created", "Price", "Notes", "Status"];
  const rows = accounts.map((account) => [
    account.email,
    account.emailPassword,
    account.chatgptPassword,
    account.dateCreated,
    String(account.price),
    account.notes ?? "",
    account.status,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(csv: string): DraftAccount[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  const [, ...body] = rows.filter((item) => item.some(Boolean));
  return body.map((item) => ({
    id: crypto.randomUUID(),
    email: item[0]?.trim() ?? "",
    emailPassword: item[1] ?? "",
    chatgptPassword: item[2] ?? "",
    dateCreated: item[3] || today,
    price: Number(item[4]) || 0,
    notes: item[5] ?? "",
    status: statuses.includes(item[6] as AdminAccountStatus) ? (item[6] as AdminAccountStatus) : "Available",
  })).filter((account) => account.email);
}
