import { notFound } from "next/navigation";
import { getProductById, getProducts } from "@/lib/admin-store";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getSiteCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  return {
    title: product ? `Edit ${product.name}` : "Edit Product",
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const categories = getSiteCategories(await getProducts()).filter((category) => category.id !== "all");

  return (
    <AdminShell title={`تعديل ${product.nameAr}`} description="القيم الحالية معروضة من seed data.">
      <ProductForm product={product} categories={categories} />
    </AdminShell>
  );
}
