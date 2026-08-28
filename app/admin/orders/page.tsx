import { getOrders, getReceiptSignedUrl } from "@/lib/admin-store";
import type { ReactNode } from "react";
import { saveOrderStatusAction, deleteOrderAction, addManualOrderAction, createWarrantyLinkAction } from "@/app/admin/orders/actions";
import { Trash2, Plus, ShoppingBag, Clock3, CheckCircle2, ShieldCheck, Copy } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatPriceDZD } from "@/lib/utils";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Orders",
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ warranty?: string }> }) {
  const warrantyToken = (await searchParams).warranty;
  const warrantyLink = warrantyToken ? absoluteUrl(`/warranty/${warrantyToken}`) : undefined;
  const orders = await getOrders();
  const receiptLinks = await Promise.all(orders.map((order) => getReceiptSignedUrl(order.receiptPath)));
  const pending = orders.filter((order) => order.status === "pending").length;
  const completed = orders.filter((order) => order.status === "paid" || order.status === "delivered").length;

  return (
    <AdminShell title="Orders" description="Review incoming orders, update status, add notes, and record manual sales.">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={<ShoppingBag className="h-5 w-5" />} label="Total orders" value={orders.length} />
        <Metric icon={<Clock3 className="h-5 w-5" />} label="Pending" value={pending} />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed} />
      </div>

      <section className="mb-6 rounded-md border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">Add Manual Sale</h2>
          <p className="text-sm font-semibold text-white/55">Use this for WhatsApp or offline sales that should appear in analytics.</p>
        </div>
        <form action={addManualOrderAction} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_160px_160px_auto] xl:items-end">
          <label className="grid gap-1 text-sm font-bold text-white">
            Description
            <input name="customerName" placeholder="e.g. WhatsApp Sale" required className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Amount (DA)
            <input name="total" type="number" min="1" required className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Payment
            <select name="paymentMethod" defaultValue="BaridiMob" className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember">
              <option value="BaridiMob">BaridiMob</option>
              <option value="Binance">Binance</option>
              <option value="RedotPay">RedotPay</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Status
            <select name="status" className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember">
              <option value="paid">paid</option>
              <option value="delivered">delivered</option>
            </select>
          </label>
          <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 font-black text-black transition-colors hover:bg-tiger-gold">
            <Plus className="h-4 w-4" /> Add Sale
          </button>
        </form>
      </section>

      {warrantyToken ? (
        <section className="mb-6 rounded-md border border-tiger-ember/40 bg-tiger-ember/10 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-tiger-gold"><ShieldCheck className="h-4 w-4" /> Warranty link ready</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/70">Send this private link to the customer after delivery. They complete the certificate form themselves.</p>
            </div>
            <a href={warrantyLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black"><Copy className="h-4 w-4" /> Open warranty link</a>
          </div>
          <p className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-3 font-mono text-xs text-white/80" dir="ltr">{warrantyLink}</p>
        </section>
      ) : null}

      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order, index) => (
            <article key={order.id} className="rounded-md border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-white">{order.customerName || "Customer"}</h2>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white/45">{order.id}</p>
                </div>
                <p className="text-2xl font-black text-tiger-gold">{formatPriceDZD(order.total, "en")}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Info label="Phone" value={order.phone || "-"} />
                <Info label="Email" value={order.email || "-"} />
                <Info label="Payment" value={order.paymentMethod} />
                <Info label="Date" value={new Date(order.createdAt).toLocaleString("en-US")} />
                <Info label="Products" value={order.products.length ? order.products.map((item) => `${item.name} — ${item.option} ×${item.quantity}`).join("\n") : "Manual order"} />
                <Info label="Notes" value={order.notes || "-"} />
                <Info label="Receipt" value={receiptLinks[index] ? "Receipt uploaded" : "No receipt"} />
              </div>

              {receiptLinks[index] ? <a href={receiptLinks[index]} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-black text-black">Open private receipt</a> : null}

              <form action={saveOrderStatusAction}>
                <input type="hidden" name="id" value={order.id} />
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr]">
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Admin notes
                    <input name="adminNotes" defaultValue={order.adminNotes ?? ""} className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember" />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">{(["pending", "paid", "delivered", "cancelled"] as const).map((status) => <button key={status} type="submit" name="status" value={status} className={`min-h-11 rounded-xl px-4 font-black ${order.status === status ? "bg-tiger-ember text-black" : "border border-white/15 text-white"}`}>{status}</button>)}</div>
                  <button formAction={deleteOrderAction} className="flex min-h-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-5 font-bold text-red-300 transition-colors hover:bg-red-500/20">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                  </button>
                </div>
              </form>
              {order.status === "delivered" && order.products.length ? (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-black text-tiger-gold"><ShieldCheck className="h-4 w-4" /> Issue warranty certificate</p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {order.products.map((item, itemIndex) => (
                      <form key={`${item.id}-${itemIndex}`} action={createWarrantyLinkAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="itemIndex" value={itemIndex} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{item.name}</p>
                          <p className="mt-1 text-xs font-semibold text-white/55">{item.option}</p>
                        </div>
                        <label className="grid gap-1 text-xs font-bold text-white/75">Coverage days
                          <input name="coveredDays" type="number" min="1" max="3650" defaultValue="365" required className="h-10 w-28 rounded-lg border border-white/10 bg-black px-2 text-sm font-bold text-white outline-none focus:border-tiger-ember" />
                        </label>
                        <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-tiger-ember px-3 text-sm font-black text-black"><ShieldCheck className="h-4 w-4" /> Create link</button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/10 bg-white/[0.045] p-8 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-white/35" />
          <h2 className="mt-4 text-xl font-black text-white">No orders yet</h2>
          <p className="mt-2 leading-7 text-white/58">
            New checkout submissions and manual sales will appear here.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 text-tiger-ember">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className = {
    pending: "bg-amber-400/10 text-amber-300",
    paid: "bg-emerald-400/10 text-emerald-300",
    delivered: "bg-sky-400/10 text-sky-300",
    cancelled: "bg-red-400/10 text-red-300",
    refunded: "bg-violet-400/10 text-violet-300",
  }[status] ?? "bg-white/8 text-white/60";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${className}`}>{status}</span>;
}
