import { AccountsTable } from "@/components/admin/AccountsTable";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAccounts } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Accounts",
};

export default async function AdminAccountsPage() {
  const accounts = await getAccounts();

  return (
    <AdminShell
      title="Account Management"
      description="Internal subscription credentials, prices, and account status tracking for admins only."
    >
      <AccountsTable accounts={accounts} />
    </AdminShell>
  );
}
