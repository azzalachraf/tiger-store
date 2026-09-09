import { AdminShell } from "@/components/admin/AdminShell";
import { TeamWorkspace } from "@/components/admin/TeamWorkspace";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };
export default async function AdminTeamPage() {
  await requireAdmin();
  const client = getSupabaseServiceClient();
  const [{ data, error }, { data: active, error: activeError }] =
    await Promise.all([
      client
        .from("telegram_users")
        .select("telegram_user_id,first_name,username,role,created_at")
        .order("created_at", { ascending: true }),
      client
        .from("snapchat_operations")
        .select("admin_telegram_user_id")
        .eq("status", "active"),
    ]);
  if (error || activeError) throw new Error("Team could not be loaded.");
  return (
    <AdminShell
      title="Team"
      description="Manage display names, client sheets and Telegram admin access."
    >
      <TeamWorkspace
        members={(data ?? []).map((m) => ({
          id: String(m.telegram_user_id),
          name: String(m.first_name ?? ""),
          username: String(m.username ?? ""),
          role: m.role as "pending" | "admin" | "owner",
          active: (active ?? []).filter(
            (o) =>
              String(o.admin_telegram_user_id) === String(m.telegram_user_id),
          ).length,
        }))}
      />
    </AdminShell>
  );
}
