import Link from "next/link";
import { getProducts } from "@/lib/admin-store";
import { deleteProductAction } from "@/app/admin/products/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { calculateDiscount, formatPriceDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Products",
};

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <AdminShell title="المنتجات" description="إضافة وتعديل وحذف المنتجات من مخزن JSON المحلي للتطوير.">
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/products/new">إضافة منتج</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-3 text-right">المنتج</th>
                <th className="px-4 py-3 text-right">القسم</th>
                <th className="px-4 py-3 text-right">السعر</th>
                <th className="px-4 py-3 text-right">الخصم</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">مميز</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const discount = calculateDiscount(product.oldPrice, product.price);
                return (
                  <tr key={product.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-bold text-white">{product.nameAr}</td>
                    <td className="px-4 py-3 text-white/65">{product.categoryAr}</td>
                    <td className="px-4 py-3 text-tiger-gold">{formatPriceDZD(product.price)}</td>
                    <td className="px-4 py-3 text-white/65">{discount ? `${discount}%` : "-"}</td>
                    <td className="px-4 py-3 text-white/65">{product.available ? "متوفر" : "غير متوفر"}</td>
                    <td className="px-4 py-3 text-white/65">{product.featured ? "نعم" : "لا"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/products/${product.id}/edit`} className="font-bold text-tiger-gold">
                          تعديل
                        </Link>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button type="submit" className="font-bold text-red-300">حذف</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
