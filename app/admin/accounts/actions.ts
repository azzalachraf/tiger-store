"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteAccount, saveAccount, saveAccounts } from "@/lib/admin-store";
import { AdminAccount, AdminAccountStatus } from "@/lib/types";
import { adminAccountSchema } from "@/lib/validation";

const statuses: AdminAccountStatus[] = ["Available", "Sold", "Expired", "Problem"];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function statusValue(value: string): AdminAccountStatus {
  return statuses.includes(value as AdminAccountStatus) ? (value as AdminAccountStatus) : "Available";
}

function accountFromForm(formData: FormData): AdminAccount {
  const now = new Date().toISOString();
  const id = text(formData, "id") || crypto.randomUUID();
  const price = Number(text(formData, "price"));

  return {
    id,
    email: text(formData, "email"),
    emailPassword: text(formData, "emailPassword"),
    chatgptPassword: text(formData, "chatgptPassword"),
    dateCreated: text(formData, "dateCreated") || now.slice(0, 10),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    notes: text(formData, "notes"),
    status: statusValue(text(formData, "status")),
    updatedAt: now,
  };
}

export async function saveAccountAction(formData: FormData) {
  await requireAdmin();
  await saveAccount(adminAccountSchema.parse(accountFromForm(formData)));
  revalidatePath("/admin/accounts");
}

export async function deleteAccountAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing account id.");
  await deleteAccount(id);
  revalidatePath("/admin/accounts");
}

export async function importAccountsAction(formData: FormData) {
  await requireAdmin();

  const raw = text(formData, "accounts");
  const parsed = JSON.parse(raw) as Partial<AdminAccount>[];
  if (!Array.isArray(parsed) || parsed.length > 500) {
    throw new Error("Import must contain between 1 and 500 accounts.");
  }
  const now = new Date().toISOString();
  const accounts = parsed
    .map((account) => {
      const price = Number(account.price);
      return {
        id: String(account.id || crypto.randomUUID()),
        email: String(account.email ?? "").trim(),
        emailPassword: String(account.emailPassword ?? ""),
        chatgptPassword: String(account.chatgptPassword ?? ""),
        dateCreated: String(account.dateCreated || now.slice(0, 10)),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        notes: String(account.notes ?? ""),
        status: statusValue(String(account.status ?? "Available")),
        updatedAt: now,
      };
    })
    .filter((account) => account.email)
    .map((account) => adminAccountSchema.parse(account));

  if (accounts.length) {
    await saveAccounts(accounts);
    revalidatePath("/admin/accounts");
  }
}
