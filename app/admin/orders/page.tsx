import { getProducts } from "@/lib/admin-store";
import type { ReactNode } from "react";
import {
  addManualOrderAction,
  createProductCheckoutLinkAction,
} from "@/app/admin/orders/actions";
import {
  Plus,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatPriceDZD } from "@/lib/utils";
import { absoluteUrl } from "@/lib/seo";
import { verifyWarrantyLink } from "@/lib/warranty";
import { resolveProductCheckoutLinkTarget } from "@/lib/product-checkout-link";
import { getFinanceReports } from "@/lib/finance";
import {
  GoogleSheetsOrderCopy,
  type GoogleSheetsOrderRow,
} from "@/components/admin/GoogleSheetsOrderCopy";
import { getCompletedTelegramWarrantyDetails } from "@/lib/telegram-warranty";

import { OrdersWorkspace } from "@/components/admin/OrdersWorkspace";
import { ActionForm } from "@/components/admin/ActionForm";
import { readAdminOrders } from "@/app/admin/read-orders";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Orders",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    warranty?: string;
    checkout?: string;
    notice?: string;
    q?: string;
  }>;
}) {
  await requireAdmin();
  const {
    warranty: warrantyToken,
    checkout: checkoutToken,
    notice,
    q,
  } = await searchParams;
  const warrantyPayload = warrantyToken
    ? verifyWarrantyLink(warrantyToken)
    : undefined;
  const warrantyLink =
    warrantyPayload && warrantyToken
      ? absoluteUrl(`/warranty/${warrantyToken}`)
      : undefined;
  const checkoutPayload = checkoutToken
    ? await resolveProductCheckoutLinkTarget(checkoutToken)
    : undefined;
  const checkoutLink =
    checkoutPayload && checkoutToken
      ? `https://tiger-storedz.com/p/${checkoutToken}`
      : undefined;
  const [orders, products, finance] = await Promise.all([
    readAdminOrders(),
    getProducts(),
    getFinanceReports().catch(() => null),
  ]);
  const warrantyDetailsByOrderId = await getCompletedTelegramWarrantyDetails(
    orders.map((order) => order.id),
  ).catch(() => new Map());
  const pending = orders.filter((order) => order.status === "pending").length;
  const completed = orders.filter(
    (order) => order.status === "paid" || order.status === "delivered",
  ).length;
  const cardCostByOrder = new Map(
    (finance?.sales ?? []).map((sale) => [
      String(sale.order_id),
      Number(sale.card_cost_dzd),
    ]),
  );
  const sheetsRows: GoogleSheetsOrderRow[] = orders.map((order) => ({
    client: order.customerName,
    phone: order.phone,
    email: order.email,
    username: warrantyDetailsByOrderId.get(order.id)?.username ?? "",
    activationPlatform:
      warrantyDetailsByOrderId.get(order.id)?.activationPlatform ?? "",
    orderCode: order.id,
    subscription: order.products.length
      ? order.products.map((item) => item.name).join(" + ")
      : "Manual order",
    duration: order.products.length
      ? order.products.map((item) => item.option || item.duration).join(" + ")
      : "",
    quantity: order.products.length
      ? String(order.products.reduce((sum, item) => sum + item.quantity, 0))
      : "",
    costPrice: cardCostByOrder.has(order.id)
      ? String(cardCostByOrder.get(order.id))
      : "",
    amountPaid: String(order.total),
    spend: "",
    cost: "",
    netProfit: "",
    paymentMethod: order.paymentMethod,
    status: order.status,
    orderDate: order.createdAt,
    notes: order.notes ?? "",
    completed: order.status === "paid" || order.status === "delivered",
  }));

  return (
    <AdminShell
      title="Orders"
      description="Review incoming orders, update status, add notes, and record manual sales."
    >
      {notice === "order-deleted" ? (
        <p className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
          Order and all linked records were permanently deleted.
        </p>
      ) : null}
      {notice === "order-deleted-receipt-pending" ? (
        <p className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
          Order records were deleted. The private receipt could not be removed
          automatically; remove it from the receipts bucket.
        </p>
      ) : null}
      {notice === "order-missing" ? (
        <p className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
          That order no longer exists.
        </p>
      ) : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<ShoppingBag className="h-5 w-5" />}
          label="📦 Total orders"
          value={orders.length}
        />
        <Metric
          icon={<Clock3 className="h-5 w-5" />}
          label="⏳ Pending"
          value={pending}
        />
        <Metric
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="✅ Completed"
          value={completed}
        />
      </div>

      <details className="mb-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <summary className="cursor-pointer list-none text-sm font-black text-white">
          <span className="flex items-center gap-2">
            📋 Google Sheets copy table{" "}
            <span className="text-xs font-semibold text-white/45">
              Optional export
            </span>
          </span>
        </summary>
        <div className="mt-4">
          <GoogleSheetsOrderCopy rows={sheetsRows} />
        </div>
      </details>

      <details className="mb-6 rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
        <summary className="cursor-pointer list-none text-lg font-black text-white">
          <span className="flex items-center gap-2">➕ Add manual sale</span>
        </summary>
        <p className="mt-3 text-sm font-semibold text-white/55">
          Use this for message or offline sales that should appear in analytics.
        </p>
        <ActionForm
          action={addManualOrderAction}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_160px_160px_auto] xl:items-end"
        >
          <label className="grid gap-1 text-sm font-bold text-white">
            Description
            <input
              name="customerName"
              placeholder="e.g. WhatsApp Sale"
              required
              className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Amount (DA)
            <input
              name="total"
              type="number"
              min="1"
              required
              className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Payment
            <select
              name="paymentMethod"
              defaultValue="BaridiMob"
              className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember"
            >
              <option value="BaridiMob">BaridiMob</option>
              <option value="Binance">Binance</option>
              <option value="RedotPay">RedotPay</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-white">
            Status
            <select
              name="status"
              className="min-h-11 rounded-xl border border-white/10 bg-black/45 px-3 text-white outline-none focus:border-tiger-ember"
            >
              <option value="paid">paid</option>
              <option value="delivered">delivered</option>
            </select>
          </label>
          <button
            type="submit"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 font-black text-black transition-colors hover:bg-tiger-gold"
          >
            <Plus className="h-4 w-4" /> Add Sale
          </button>
        </ActionForm>
      </details>

      <details className="mb-6 rounded-md border border-tiger-ember/25 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
        <summary className="cursor-pointer list-none text-lg font-black text-white">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-tiger-ember" /> Generate
            product payment link
          </span>
        </summary>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/60">
          Use this for a message sale. Pick the product and plan, then send the
          private link. The customer enters their details, selects a payment
          method, and uploads the receipt. Their order appears here as pending
          for review.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {products.flatMap((product) => {
            const offers = product.priceOptions?.length
              ? product.priceOptions
              : [
                  {
                    id: `${product.id}:default`,
                    label: product.duration,
                    labelAr: product.durationAr,
                    price: product.price,
                  },
                ];
            return offers.map((offer) => (
              <ActionForm
                key={`${product.id}-${offer.id}`}
                action={createProductCheckoutLinkAction}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-black/25 p-3"
              >
                <input type="hidden" name="slug" value={product.slug} />
                <input type="hidden" name="optionId" value={offer.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/55">
                    {offer.label}
                  </p>
                </div>
                <p className="text-sm font-black text-tiger-gold">
                  {formatPriceDZD(offer.price, "en")}
                </p>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-tiger-ember px-3 text-sm font-black text-black"
                >
                  <ShieldCheck className="h-4 w-4" /> Create payment link
                </button>
              </ActionForm>
            ));
          })}
        </div>
      </details>

      {checkoutPayload && checkoutLink ? (
        <section className="mb-6 rounded-md border border-tiger-ember/40 bg-tiger-ember/10 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-tiger-gold">
                <ShieldCheck className="h-4 w-4" /> Payment link ready
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/70">
                Send this link to the customer. The final price is resolved from
                the selected product plan on the server; the customer chooses
                payment and uploads their receipt.
              </p>
            </div>
            <a
              href={checkoutLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black"
            >
              <Copy className="h-4 w-4" /> Open payment link
            </a>
          </div>
          <p
            className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-3 font-mono text-xs text-white/80"
            dir="ltr"
          >
            {checkoutLink}
          </p>
        </section>
      ) : null}

      {warrantyPayload && warrantyLink ? (
        <section className="mb-6 rounded-md border border-tiger-ember/40 bg-tiger-ember/10 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-tiger-gold">
                <ShieldCheck className="h-4 w-4" /> Warranty link ready
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/70">
                {warrantyPayload.source === "direct"
                  ? "Send this private link to the message-sale customer. Their completed form creates the delivered order and certificate."
                  : "Send this private link to the customer after delivery. They complete the certificate form themselves."}
              </p>
            </div>
            <a
              href={warrantyLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black"
            >
              <Copy className="h-4 w-4" /> Open warranty link
            </a>
          </div>
          <p
            className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-3 font-mono text-xs text-white/80"
            dir="ltr"
          >
            {warrantyLink}
          </p>
        </section>
      ) : null}

      <OrdersWorkspace orders={orders} initialQuery={q} />
    </AdminShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 text-tiger-ember">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
