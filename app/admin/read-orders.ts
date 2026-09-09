import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { adminOrderSchema } from "@/lib/validation";
import type { AdminOrder } from "@/lib/types";
// Read in batches so Supabase's response limit never silently truncates reports.
export async function readAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin();
  const orders: AdminOrder[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseServiceClient()
      .from("orders")
      .select("*")
      .order("createdAt", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Orders could not be loaded. Please retry.");
    orders.push(...adminOrderSchema.array().parse(data ?? []));
    if (!data || data.length < 500) return orders;
  }
}
