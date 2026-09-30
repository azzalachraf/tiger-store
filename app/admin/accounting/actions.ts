"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { accountingMovementSchema, accountingSaleSchema } from "@/lib/validation";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
function assertNotFuture(date: string) {
  if (date > new Date().toISOString().slice(0, 10)) throw new Error("Future accounting dates are not allowed.");
}

export async function addAccountingSaleAction(formData: FormData) {
  const session = await requireAdminAction();
  const input = accountingSaleSchema.parse({ customerName: field(formData, "customerName"), amountDzd: field(formData, "amountDzd"), accountId: field(formData, "accountId"), occurredOn: field(formData, "occurredOn"), reference: field(formData, "reference"), note: field(formData, "note") });
  assertNotFuture(input.occurredOn);
  const client = getSupabaseServiceClient();
  const { data: account, error: accountError } = await client.from("accounting_accounts").select("payment_method").eq("id", input.accountId).eq("active", true).maybeSingle<{ payment_method: string }>();
  if (accountError || !account) throw new Error("The selected money account is unavailable.");
  const { error } = await client.rpc("record_accounting_sale", {
    p_order_id: randomUUID(), p_customer_name: input.customerName, p_amount_dzd: input.amountDzd,
    p_payment_method: account.payment_method, p_account_id: input.accountId, p_occurred_on: input.occurredOn,
    p_reference: input.reference, p_note: input.note, p_created_by_email: session.identity.email,
  });
  if (error) throw new Error("The sale could not be recorded.");
  revalidatePath("/admin", "layout");
}

export async function recordAccountingMovementAction(formData: FormData) {
  const session = await requireAdminAction();
  const input = accountingMovementSchema.parse({ kind: field(formData, "kind"), amountDzd: field(formData, "amountDzd"), occurredOn: field(formData, "occurredOn"), accountId: field(formData, "accountId"), transferAccountId: field(formData, "transferAccountId"), orderId: field(formData, "orderId") || undefined, reference: field(formData, "reference"), note: field(formData, "note") });
  assertNotFuture(input.occurredOn);
  const { error } = await getSupabaseServiceClient().rpc("record_accounting_movement", {
    p_kind: input.kind, p_amount_dzd: input.amountDzd, p_occurred_on: input.occurredOn,
    p_account_id: input.accountId, p_transfer_account_id: input.transferAccountId ?? null,
    p_order_id: input.orderId ?? null, p_reference: input.reference, p_note: input.note,
    p_created_by_email: session.identity.email,
  });
  if (error) throw new Error("The money movement could not be recorded.");
  revalidatePath("/admin/accounting");
}
