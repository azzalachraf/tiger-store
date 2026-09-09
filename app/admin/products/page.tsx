import { AdminShell } from "@/components/admin/AdminShell";
import { ProductsWorkspace } from "@/components/admin/ProductsWorkspace";
import { getProducts } from "@/lib/admin-store";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Products" };
export default async function AdminProductsPage() {
  await requireAdmin();
  return (
    <AdminShell
      title="Products"
      description="Manage your catalog, plans, pricing, availability and images."
    >
      <ProductsWorkspace products={await getProducts()} />
    </AdminShell>
  );
}
