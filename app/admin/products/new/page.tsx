import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Product",
};

export default function NewProductPage() {
  return (
    <AdminShell title="منتج جديد" description="نموذج جاهز للربط لاحقا مع قاعدة بيانات أو API.">
      <ProductForm />
    </AdminShell>
  );
}
