import { getOrders } from "@/lib/admin-store";
import { saveOrderStatusAction, deleteOrderAction, addManualOrderAction } from "@/app/admin/orders/actions";
import { Trash2, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatPriceDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Orders",
};

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <AdminShell title="Orders" description="Order management and manual statistics adjustments.">
      <section className="mb-8 rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">Add Manual Sale</h2>
          <p className="text-sm text-white/55">Quickly add a manual sale to your statistics.</p>
        </div>
        <form action={addManualOrderAction} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-bold text-white">
            Description
            <input name="customerName" placeholder="e.g. WhatsApp Sale" required className="min-h-11 rounded-xl border border-white/10 bg-black px-3 text-white" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Amount (DA)
            <input name="total" type="number" required className="min-h-11 w-32 rounded-xl border border-white/10 bg-black px-3 text-white" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Status
            <select name="status" className="min-h-11 rounded-xl border border-white/10 bg-black px-3 text-white">
              <option value="paid">paid</option>
              <option value="delivered">delivered</option>
            </select>
          </label>
          <button type="submit" className="flex min-h-11 items-center gap-2 rounded-xl bg-tiger-ember px-4 font-black text-black transition-colors hover:bg-tiger-gold">
            <Plus className="h-4 w-4" /> Add Sale
          </button>
        </form>
      </section>

      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <form key={order.id} action={saveOrderStatusAction} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <input type="hidden" name="order" value={JSON.stringify(order)} />
              <input type="hidden" name="id" value={order.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Customer" value={order.customerName} />
                <Info label="Phone" value={order.phone} />
                <Info label="Email" value={order.email} />
                <Info label="Payment" value={order.paymentMethod} />
                <Info label="Total" value={formatPriceDZD(order.total, "en")} />
                <Info label="Date" value={new Date(order.createdAt).toLocaleString("en-US")} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-white">
                  Status
                  <select name="status" defaultValue={order.status} className="min-h-11 rounded-xl border border-white/10 bg-black px-3 text-white">
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-white">
                  Admin notes
                  <input name="adminNotes" defaultValue={order.adminNotes ?? ""} className="min-h-11 rounded-xl border border-white/10 bg-black px-3 text-white" />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button type="submit" className="min-h-11 rounded-xl bg-tiger-ember px-5 font-black text-black">Save Order</button>
                <button formAction={deleteOrderAction} className="flex min-h-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-5 font-bold text-red-400 transition-colors hover:bg-red-500/20">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-xl font-black text-white">No saved orders yet</h2>
          <p className="mt-3 leading-7 text-white/58">
            This page is ready to display orders when backend storage or Supabase is added.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
