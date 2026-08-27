import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Package, ShoppingBag } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getOrders, getProducts } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";
import { formatPriceDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Overview",
};

export default async function AdminDashboardPage() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const pending = orders.filter((order) => order.status === "pending").length;
  const fulfilled = orders.filter((order) => order.status === "paid" || order.status === "delivered").length;
  const availableProducts = products.filter((product) => product.available).length;
  const categories = getSiteCategories(products).filter((category) => category.id !== "all");

  return (
    <AdminShell title="نظرة عامة" description="طلباتك، المنتجات المتوفرة، والأقسام الحقيقية في مكان واحد.">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary href="/admin/orders" label="طلبات بانتظار المراجعة" value={pending} icon={<AlertCircle className="h-5 w-5" />} tone="amber" />
        <Summary href="/admin/orders" label="طلبات مؤكدة أو مسلّمة" value={fulfilled} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <Summary href="/admin/products" label="منتجات متوفرة" value={availableProducts} icon={<Package className="h-5 w-5" />} tone="orange" />
        <Summary href="/admin/products" label="أقسام الكتالوج" value={categories.length} icon={<ShoppingBag className="h-5 w-5" />} tone="orange" />
      </section>

      <section className="mt-5 rounded-md border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">أحدث الطلبات</h2>
            <p className="mt-1 text-sm text-white/55">تظهر هنا الطلبات المحفوظة في Supabase فقط.</p>
          </div>
          <Link href="/admin/orders" className="rounded-xl bg-tiger-ember px-4 py-2 text-sm font-black text-black">كل الطلبات</Link>
        </div>

        {orders.length ? (
          <div className="mt-4 grid gap-3">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} href="/admin/orders" className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-4 transition-colors hover:border-tiger-ember/40 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-black text-white">{order.id}</p>
                  <p className="mt-1 text-sm text-white/55">{order.customerName || "طلب يدوي"} · {order.paymentMethod}</p>
                </div>
                <p className="font-black text-tiger-gold">{formatPriceDZD(order.total, "en")}</p>
                <Status status={order.status} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">لا توجد طلبات بعد.</p>
        )}
      </section>

      <section className="mt-5 rounded-md border border-white/10 bg-white/[0.045] p-5">
        <h2 className="text-xl font-black text-white">أقسام المتجر الحالية</h2>
        <p className="mt-1 text-sm text-white/55">تُستخرج تلقائياً من المنتجات الحالية، بدون أقسام قديمة أو فارغة.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => <span key={category.id} className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-white/75">{category.name.ar} <span className="text-white/40">/ {category.name.en}</span></span>)}
        </div>
      </section>
    </AdminShell>
  );
}

function Summary({ href, label, value, icon, tone }: { href: string; label: string; value: number; icon: ReactNode; tone: "amber" | "green" | "orange" }) {
  const toneClass = tone === "green" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-tiger-ember";
  return <Link href={href} className="rounded-md border border-white/10 bg-white/[0.045] p-4 transition-colors hover:border-tiger-ember/40"><div className={toneClass}>{icon}</div><p className="mt-3 text-xs font-black text-white/45">{label}</p><p className="mt-1 text-3xl font-black text-white">{value}</p></Link>;
}

function Status({ status }: { status: string }) {
  const labels: Record<string, string> = { pending: "قيد المراجعة", paid: "مدفوع", delivered: "تم التسليم", cancelled: "ملغى", refunded: "مسترجع" };
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/75">{labels[status] ?? status}</span>;
}
