import Link from "next/link";
import type { ReactNode } from "react";
import { Boxes, CheckCircle2, Plus, Star, XCircle } from "lucide-react";
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
  const available = products.filter((product) => product.available).length;
  const featured = products.filter((product) => product.featured).length;

  return (
    <AdminShell title="Products" description="Manage catalog items, pricing, availability, categories, images, and product variants.">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Boxes className="h-5 w-5" />} label="Total products" value={products.length} />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Available" value={available} />
        <SummaryCard icon={<Star className="h-5 w-5" />} label="Featured" value={featured} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Catalog</h2>
          <p className="mt-1 text-sm font-semibold text-white/55">Review product health and jump into editing quickly.</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.045] shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-white/[0.055] text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Featured</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {products.map((product) => {
                const discount = calculateDiscount(product.oldPrice, product.price);
                return (
                  <tr key={product.id} className="transition-colors duration-150 hover:bg-white/[0.035]">
                    <td className="px-4 py-3">
                      <p className="font-black text-white">{product.name}</p>
                      <p className="mt-1 text-xs font-semibold text-white/45">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{product.category}</td>
                    <td className="px-4 py-3 font-black text-tiger-gold">{formatPriceDZD(product.price)}</td>
                    <td className="px-4 py-3 text-white/65">{discount ? `${discount}%` : "-"}</td>
                    <td className="px-4 py-3">
                      <StatusPill active={product.available} activeText="Available" inactiveText="Unavailable" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={product.featured} activeText="Featured" inactiveText="Standard" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/products/${product.id}/edit`} className="font-bold text-tiger-gold hover:text-white">
                          Edit
                        </Link>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button type="submit" className="font-bold text-red-300 hover:text-red-200">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!products.length ? (
          <div className="p-8 text-center">
            <XCircle className="mx-auto h-8 w-8 text-white/35" />
            <p className="mt-3 font-bold text-white">No products yet</p>
            <p className="mt-1 text-sm text-white/50">Create your first product to start selling.</p>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 text-tiger-ember">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusPill({ active, activeText, inactiveText }: { active: boolean; activeText: string; inactiveText: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-emerald-400/10 text-emerald-300" : "bg-white/8 text-white/50"}`}>
      {active ? activeText : inactiveText}
    </span>
  );
}
