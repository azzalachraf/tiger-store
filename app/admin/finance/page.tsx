import { getSupabaseServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { readAdminOrders } from "@/app/admin/read-orders";
import { FinanceLedger } from "@/components/admin/FinanceLedger";
import { ReportRangeControls } from "@/components/admin/ReportRangeControls";
import { reportRange, type ReportQuery } from "@/components/admin/reporting";
import { localDay } from "@/components/admin/data-tools";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  addAdminAdjustmentAction,
  markAdminPaidAction,
  recordAdvertisingSpendAction,
  saveAdminPaymentScheduleAction,
  saveFinanceSettingsAction,
} from "@/app/admin/finance/actions";
import {
  getAdminFinanceSummary,
  getFinanceReports,
  getFinanceSettings,
} from "@/lib/finance";
import { cardLabel, snapchatCardTypes } from "@/lib/snapchat-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Finance" };

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<ReportQuery>;
}) {
  await requireAdmin();
  const range = reportRange(await searchParams);
  const [settings, reports, orders, team] = await Promise.all([
    getFinanceSettings(),
    getFinanceReports(),
    readAdminOrders(),
    getSupabaseServiceClient()
      .from("telegram_users")
      .select(
        "telegram_user_id, first_name, username, role, work_started_at, next_payment_date",
      ),
  ]);
  if (team.error) throw new Error("Finance team could not be loaded.");
  const admins = team.data ?? reports.admins;
  const summaries = await Promise.all(
    admins.map((admin) =>
      getAdminFinanceSummary(String(admin.telegram_user_id)),
    ),
  );
  const today = localDay(new Date());
  const labels = new Map(
    admins.map((a) => [
      String(a.telegram_user_id),
      a.first_name || a.username || "Former admin",
    ]),
  );
  const financeIds = new Set(reports.sales.map((s) => String(s.order_id)));
  const ledger = [
    ...reports.sales
      .filter(
        (s) =>
          !orders.some(
            (o) =>
              o.id === String(s.order_id) &&
              (o.status === "cancelled" || o.status === "refunded"),
          ),
      )
      .map((s) => ({
        id: String(s.order_id),
        adminId: String(s.admin_telegram_user_id),
        admin: labels.get(String(s.admin_telegram_user_id)) || "Former admin",
        plan: Number(s.plan_months),
        date: String(s.completed_at),
        revenue: Number(s.revenue_dzd),
        cost: Number(s.card_cost_dzd),
        credit: Number(s.commission_dzd),
      })),
    ...orders
      .filter((o) => o.status === "delivered" && !financeIds.has(o.id))
      .map((o) => ({
        id: o.id,
        adminId: "website",
        admin: "Website",
        plan: 0,
        date: o.createdAt,
        revenue: o.total,
        cost: 0,
        credit: 0,
      })),
  ]
    .filter(
      (s) => localDay(s.date) >= range.start && localDay(s.date) <= range.end,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const spend = reports.advertisingSpend
    .filter(
      (s) =>
        String(s.spend_date) >= range.start &&
        String(s.spend_date) <= range.end,
    )
    .map((s) => ({
      date: String(s.spend_date),
      amount: Number(s.amount_dzd),
      platform: String(s.platform),
    }));

  return (
    <AdminShell
      title="Finances"
      description="Review sales and profit, settle admin credit and manage financial settings."
    >
      <ReportRangeControls value={range} />
      <FinanceLedger sales={ledger} spend={spend} />
      <div className="grid gap-5 mt-6">
        <details className="admin-panel">
          <summary className="admin-panel-title">
            Admin balances & payments
          </summary>
          <p className="admin-muted my-4">
            Lifetime balances. Reporting dates above do not change outstanding
            credit.
          </p>
          <section className="grid gap-3">
            {admins.map((admin, index) => {
              const summary = summaries[index];
              return (
                <details
                  key={summary.adminId}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
                >
                  <summary className="flex flex-wrap justify-between gap-2">
                    <h2 className="font-black">
                      👤{" "}
                      {admin.first_name ??
                        admin.username ??
                        `Admin ${summary.adminId}`}
                    </h2>
                    <p className="font-black text-tiger-gold">
                      Remaining credit: {summary.remainingDzd} DA
                    </p>
                  </summary>
                  <p className="mt-2 text-sm text-white/60">
                    Completed orders: {summary.completedOrders} · Earned credit:{" "}
                    {summary.commissionDzd} · Paid: {summary.paidDzd} ·
                    Adjustments: {summary.adjustmentsDzd} · Next payment:{" "}
                    {summary.nextPaymentDate}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {admin.role === "pending" ? (
                      <p className="admin-muted">
                        Bot access removed. History and remaining credit are
                        retained; scheduling resumes after re-approval.
                      </p>
                    ) : (
                      <>
                        <ActionForm
                          action={saveAdminPaymentScheduleAction}
                          className="grid gap-2"
                        >
                          <input
                            type="hidden"
                            name="adminId"
                            value={summary.adminId}
                          />
                          <label className="text-xs text-white/60">
                            Work started
                            <input
                              required
                              name="workStartedAt"
                              type="date"
                              defaultValue={admin.work_started_at ?? today}
                              className="mt-1 min-h-11 w-full rounded-xl bg-black px-3"
                            />
                          </label>
                          <label className="text-xs text-white/60">
                            Next payment date
                            <input
                              required
                              name="nextPaymentDate"
                              type="date"
                              defaultValue={
                                admin.next_payment_date ??
                                summary.nextPaymentDate
                              }
                              className="mt-1 min-h-11 w-full rounded-xl bg-black px-3"
                            />
                          </label>
                          <button className="min-h-11 rounded-xl border border-white/20">
                            Save schedule
                          </button>
                        </ActionForm>
                      </>
                    )}
                    <ActionForm
                      action={addAdminAdjustmentAction}
                      className="grid gap-2"
                    >
                      <input
                        type="hidden"
                        name="adminId"
                        value={summary.adminId}
                      />
                      <input
                        required
                        name="amountDzd"
                        type="number"
                        placeholder="+ / - DA"
                        className="min-h-11 rounded-xl bg-black px-3"
                      />
                      <input
                        required
                        minLength={2}
                        name="reason"
                        placeholder="Reason"
                        className="min-h-11 rounded-xl bg-black px-3"
                      />
                      <button className="min-h-11 rounded-xl border border-white/20">
                        Add adjustment
                      </button>
                    </ActionForm>
                    <ActionForm
                      action={markAdminPaidAction}
                      confirmation="Record this payment against the administrator’s remaining credit?"
                      className="grid gap-2"
                    >
                      <input
                        type="hidden"
                        name="adminId"
                        value={summary.adminId}
                      />
                      <input
                        required
                        name="amountDzd"
                        type="number"
                        min="1"
                        placeholder="Paid DA"
                        className="min-h-11 rounded-xl bg-black px-3"
                      />
                      <input
                        name="note"
                        placeholder="Note"
                        className="min-h-11 rounded-xl bg-black px-3"
                      />
                      <button className="min-h-11 rounded-xl bg-emerald-500 font-black text-black">
                        Mark paid
                      </button>
                    </ActionForm>
                  </div>
                </details>
              );
            })}
          </section>
        </details>
        <details className="admin-panel">
          <summary className="admin-panel-title">
            Record advertising spend
          </summary>
          <ActionForm
            action={recordAdvertisingSpendAction}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:grid-cols-5"
          >
            <label className="grid gap-1 text-sm font-bold text-white/75">
              Spend date
              <input
                required
                name="spentOn"
                type="date"
                defaultValue={today}
                className="min-h-11 rounded-xl bg-black px-3 text-white"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-white/75">
              Platform
              <select
                name="platform"
                defaultValue="meta"
                className="min-h-11 rounded-xl bg-black px-3 text-white"
              >
                <option value="meta">Meta</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="other">Other</option>
              </select>
            </label>
            <Field label="Campaign" name="campaign" value="" />
            <Field label="Spend DA" name="amountDzd" value="" />
            <label className="grid gap-1 text-sm font-bold text-white/75">
              Note
              <input
                name="note"
                className="min-h-11 rounded-xl bg-black px-3 text-white"
              />
            </label>
            <button className="min-h-11 rounded-xl bg-tiger-ember font-black text-black sm:col-span-5">
              Record advertising
            </button>
          </ActionForm>
        </details>
        <details className="admin-panel">
          <summary className="admin-panel-title">Financial settings</summary>{" "}
          <ActionForm
            action={saveFinanceSettingsAction}
            className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5"
          >
            <h2 className="text-xl font-black">Snapchat financial settings</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="USD/DZD"
                name="usdDzdRate"
                value={settings.usdDzdRate}
              />
              <Field
                label="Monthly payment day"
                name="paymentDay"
                value={settings.paymentDay}
              />
              <Field
                label="Google finance sheet ID"
                name="reportingSheetId"
                value={settings.reportingSheetId}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([1, 2, 3, 6, 12] as const).map((month) => (
                <div key={month} className="grid grid-cols-2 gap-2">
                  <Field
                    label={`${month} months price DA`}
                    name={`price-${month}`}
                    value={settings.plans[month].priceDzd}
                  />
                  <Field
                    label={`${month} months commission DA`}
                    name={`commission-${month}`}
                    value={100}
                    readOnly
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {snapchatCardTypes.map((card) => (
                <Field
                  key={card}
                  label={`${cardLabel(card, "en")} USD cents`}
                  name={`cost-${card}`}
                  value={settings.cardCostsUsdCents[card]}
                />
              ))}
            </div>
            <button className="min-h-12 rounded-xl bg-tiger-ember font-black text-black">
              Save settings
            </button>
          </ActionForm>
        </details>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  name,
  value,
  readOnly = false,
}: {
  label: string;
  name: string;
  value: string | number;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-white/75">
      {label}
      <input
        required
        name={name}
        defaultValue={value}
        readOnly={readOnly}
        className="min-h-11 rounded-xl bg-black px-3 text-white read-only:cursor-not-allowed read-only:opacity-70"
      />
    </label>
  );
}
