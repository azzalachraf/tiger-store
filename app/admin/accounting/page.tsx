import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, BadgeDollarSign, Landmark, PlusCircle, Scale } from "lucide-react";
import { addAccountingSaleAction, recordAccountingMovementAction } from "@/app/admin/accounting/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReportRangeControls } from "@/components/admin/ReportRangeControls";
import { reportRange, type ReportQuery } from "@/components/admin/reporting";
import { getAccountingDashboard } from "@/lib/accounting";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Accounting" };
type AccountingQuery = ReportQuery & { period?: string };
const money = (amount: number) => `${amount.toLocaleString("en-US")} DA`;

export default async function AccountingPage({ searchParams }: { searchParams: Promise<AccountingQuery> }) {
  await requireAdmin();
  const query = await searchParams;
  const range = reportRange(query);
  const dashboard = await getAccountingDashboard({ periodId: query.period, start: range.start, end: range.end });
  const today = new Date().toISOString().slice(0, 10);
  const accountById = new Map(dashboard.accounts.map((account) => [account.id, account.name]));

  return (
    <AdminShell title="Accounting" description="Reconcile paid orders with money accounts, review profit, and keep transfers separate from income.">
      <section className="admin-panel mb-5">
        <form method="get" className="admin-toolbar mb-0">
          <label className="admin-search">Accounting period
            <select name="period" defaultValue={dashboard.selectedPeriod.id}>
              {dashboard.periods.map((period) => <option key={period.id} value={period.id}>{period.name} · {period.starts_on}{period.ends_on ? ` – ${period.ends_on}` : " – current"}</option>)}
            </select>
          </label>
          <button className="admin-btn">View period</button>
        </form>
        <p className="admin-muted mt-3">Showing {dashboard.rangeStart} through {dashboard.rangeEnd}. Previous periods remain read-only and visible.</p>
      </section>
      <ReportRangeControls value={{ ...range, start: dashboard.rangeStart, end: dashboard.rangeEnd }} hidden={{ period: dashboard.selectedPeriod.id }} />

      <section className="admin-metrics" aria-label="Accounting totals">
        <Metric label="Total sales" value={money(dashboard.metrics.totalSalesDzd)} icon={<BadgeDollarSign size={18} />} />
        <Metric label="Net profit" value={money(dashboard.metrics.netProfitDzd)} icon={<Scale size={18} />} />
        <Metric label="Total net worth" value={money(dashboard.metrics.totalNetWorthDzd)} icon={<Landmark size={18} />} />
        <Metric label="Unmatched money" value={money(dashboard.metrics.unmatchedDzd)} icon={<AlertTriangle size={18} />} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <details className="admin-panel" open>
          <summary className="admin-panel-title flex items-center gap-2"><PlusCircle size={19} /> Add sale</summary>
          <p className="admin-muted mb-4">Creates one paid order, one verified payment, and one linked money entry in a single database transaction.</p>
          <ActionForm action={addAccountingSaleAction} successMessage="Sale and payment recorded." className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer" name="customerName" required />
            <Field label="Amount DA" name="amountDzd" type="number" min="1" required />
            <label className="grid gap-1 text-sm font-bold text-white/75">Money account
              <select name="accountId" required>{dashboard.accounts.filter((a) => a.active).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.paymentMethod}</option>)}</select>
            </label>
            <Field label="Sale date" name="occurredOn" type="date" defaultValue={today} max={today} required />
            <Field label="Reference" name="reference" />
            <label className="grid gap-1 text-sm font-bold text-white/75 sm:col-span-2">Note<textarea name="note" rows={2} /></label>
            <button className="admin-btn admin-btn-primary sm:col-span-2">Add sale</button>
          </ActionForm>
        </details>

        <details className="admin-panel" open>
          <summary className="admin-panel-title flex items-center gap-2"><ArrowLeftRight size={19} /> Record money movement</summary>
          <p className="admin-muted mb-4">Use sale to link an existing paid order, expense for business costs, transfer for your own accounts, or opening balance to enter a real starting balance.</p>
          <ActionForm action={recordAccountingMovementAction} successMessage="Money movement recorded." className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-white/75">Type
              <select name="kind" required defaultValue="sale"><option value="sale">Existing order payment</option><option value="expense">Expense</option><option value="transfer">Transfer between accounts</option><option value="opening_balance">Opening balance / correction</option></select>
            </label>
            <Field label="Amount DA" name="amountDzd" type="number" required />
            <Field label="Date" name="occurredOn" type="date" defaultValue={today} max={today} required />
            <label className="grid gap-1 text-sm font-bold text-white/75">Source / receiving account
              <select name="accountId" required>{dashboard.accounts.filter((a) => a.active).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-white/75">Transfer destination
              <select name="transferAccountId" defaultValue=""><option value="">Not a transfer</option>{dashboard.accounts.filter((a) => a.active).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-white/75">Paid order
              <select name="orderId" defaultValue=""><option value="">Not linked</option>{dashboard.paidOrders.map((order) => <option key={order.id} value={order.id}>{order.label}</option>)}</select>
            </label>
            <Field label="Reference" name="reference" />
            <Field label="Note" name="note" />
            <button className="admin-btn admin-btn-primary sm:col-span-2">Record movement</button>
          </ActionForm>
        </details>
      </div>

      <section className="admin-panel mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="admin-panel-title">Account balances</h2><p className="admin-muted">Sales and opening balances add money. Expenses remove it. Transfers move the same amount between your accounts.</p></div><span className="admin-muted">As of {dashboard.rangeEnd}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dashboard.accounts.map((account) => <article key={account.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><p className="admin-muted">{account.paymentMethod}</p><strong className="mt-2 block text-xl">{money(account.balanceDzd)}</strong></article>)}</div>
      </section>

      <section className="admin-panel mt-5">
        <h2 className="admin-panel-title">Reconciliation by date and method</h2>
        <p className="admin-muted mb-4">Difference = recorded money minus paid orders. Zero is matched.</p>
        <div className="admin-table-wrap"><table className="w-full min-w-[680px]"><thead><tr><th>Date</th><th>Method</th><th>Paid orders</th><th>Recorded</th><th>Difference</th><th>Counts</th></tr></thead><tbody>
          {dashboard.reconciliation.rows.map((row) => <tr key={`${row.date}-${row.paymentMethod}`}><td>{row.date}</td><td>{row.paymentMethod}</td><td>{money(row.paidOrdersDzd)}</td><td>{money(row.recordedDzd)}</td><td className={row.differenceDzd === 0 ? "text-emerald-400" : "text-amber-300"}>{money(row.differenceDzd)}</td><td>{row.orderCount} orders · {row.recordCount} records</td></tr>)}
          {!dashboard.reconciliation.rows.length && <tr><td colSpan={6} className="admin-muted">No paid orders or money records in this range.</td></tr>}
        </tbody></table></div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="admin-panel"><h2 className="admin-panel-title">Alerts</h2>
          {dashboard.unknownCostCount > 0 && <p className="admin-feedback" data-error="true">{dashboard.unknownCostCount} sale(s) have no stored product/card cost. Profit uses the existing zero-cost fallback until costs are recorded.</p>}
          <div className="mt-3 grid gap-2">{dashboard.reconciliation.alerts.slice(0, 100).map((alert) => <p key={alert.key} className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm">{alert.message}</p>)}{!dashboard.reconciliation.alerts.length && dashboard.unknownCostCount === 0 && <p className="admin-muted">No missing, duplicate, or amount mismatch alerts.</p>}</div>
        </section>
        <section className="admin-panel"><h2 className="admin-panel-title">Opening reset audit</h2><p className="admin-muted mb-3">These are balance snapshots, not cash withdrawals. Current outstanding starts at 0 after the effective date.</p>
          <div className="grid gap-2">{dashboard.resets.map((reset) => <article key={reset.id} className="rounded-xl border border-white/10 p-3 text-sm"><strong>Admin {String(reset.admin_telegram_user_id)}</strong><p className="admin-muted">Previous outstanding: {money(reset.previous_outstanding_dzd)} · earned {money(reset.previous_commission_dzd)} · paid {money(reset.previous_paid_dzd)} · adjustments {money(reset.previous_adjustments_dzd)}</p><p className="admin-muted">Effective {reset.effective_at.slice(0, 10)}</p></article>)}{!dashboard.resets.length && <p className="admin-muted">No opening reset belongs to this period.</p>}</div>
          {dashboard.periods.some((period) => period.status === "closed") && <Link className="admin-btn mt-4" href={`/admin/accounting?period=${dashboard.periods.find((period) => period.status === "closed")?.id}&range=all`}>View previous history</Link>}
        </section>
      </div>

      <section className="admin-panel mt-5"><h2 className="admin-panel-title">Recent transactions</h2><div className="admin-table-wrap mt-4"><table className="w-full min-w-[760px]"><thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Amount</th><th>Order / reference</th><th>Recorded by</th></tr></thead><tbody>
        {dashboard.transactions.slice(0, 100).map((entry) => <tr key={entry.id}><td>{entry.occurredOn}</td><td>{entry.kind.replace("_", " ")}</td><td>{accountById.get(entry.accountId)}{entry.transferAccountId ? ` → ${accountById.get(entry.transferAccountId)}` : ""}</td><td>{money(entry.amountDzd)}</td><td>{entry.orderId ?? (entry.reference || "—")}</td><td>{entry.createdByEmail}</td></tr>)}
        {!dashboard.transactions.length && <tr><td colSpan={6} className="admin-muted">No accounting transactions in this range.</td></tr>}
      </tbody></table></div></section>
    </AdminShell>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <article className="admin-metric"><p className="admin-metric-label">{icon}{label}</p><strong>{value}</strong></article>; }
function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...input } = props; return <label className="grid gap-1 text-sm font-bold text-white/75">{label}<input {...input} /></label>; }
