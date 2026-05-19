import { getOrders } from "@/lib/admin-store";
import { saveOrderStatusAction } from "@/app/admin/orders/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatPriceDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Orders",
};

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <AdminShell title="Orders" description="Order management is ready for future backend storage.">
      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <form key={order.id} action={saveOrderStatusAction} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <input type="hidden" name="order" value={JSON.stringify(order)} />
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
              <button type="submit" className="mt-4 min-h-11 rounded-xl bg-tiger-ember px-5 font-black text-black">Save Order</button>
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
