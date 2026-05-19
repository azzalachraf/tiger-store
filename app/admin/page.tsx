import { getOrders, getProducts } from "@/lib/admin-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

export default async function AdminDashboardPage() {
  const products = await getProducts();
  const orders = await getOrders();
  const totalProducts = products.length;
  const availableProducts = products.filter((product) => product.available).length;
  const unavailableProducts = totalProducts - availableProducts;
  const featuredProducts = products.filter((product) => product.featured).length;

  return (
    <AdminShell
      title="الرئيسية"
      description="نظرة سريعة على المنتجات والطلبات. الطلبات الحالية محفوظة محليا عند العميل إلى حين إضافة backend."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="كل المنتجات" value={totalProducts} />
        <MetricCard label="منتجات متوفرة" value={availableProducts} />
        <MetricCard label="غير متوفرة" value={unavailableProducts} />
        <MetricCard label="منتجات مميزة" value={featuredProducts} />
        <MetricCard label="عدد الطلبات" value={orders.length} />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
        <h2 className="text-xl font-extrabold text-white">آخر الطلبات</h2>
        <p className="mt-3 leading-7 text-white/58">
          {orders.length
            ? "آخر الطلبات محفوظة في مخزن JSON المحلي للتطوير."
            : "لا توجد طلبات محفوظة بعد. سيتم عرض آخر الطلبات هنا بعد ربط التخزين الخلفي أو Supabase."}
        </p>
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-card">
      <p className="text-sm font-bold text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{value}</p>
    </div>
  );
}
