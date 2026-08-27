import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProducts } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Product",
};

export default async function NewProductPage() {
  const categories = getSiteCategories(await getProducts()).filter((category) => category.id !== "all");
  return (
    <AdminShell title="منتج جديد" description="نموذج جاهز للربط لاحقا مع قاعدة بيانات أو API.">
      <ProductForm categories={categories} />
    </AdminShell>
  );
}
