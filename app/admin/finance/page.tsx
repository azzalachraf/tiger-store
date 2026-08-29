import { AdminShell } from "@/components/admin/AdminShell";
import { addAdminAdjustmentAction, markAdminPaidAction, recordAdvertisingSpendAction, saveAdminPaymentScheduleAction, saveFinanceSettingsAction } from "@/app/admin/finance/actions";
import { getAdminFinanceSummary, getFinanceReports, getFinanceSettings } from "@/lib/finance";
import { cardLabel, snapchatCardTypes } from "@/lib/snapchat-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Finance" };

export default async function AdminFinancePage() {
  const [settings, reports] = await Promise.all([getFinanceSettings(), getFinanceReports()]);
  const summaries = await Promise.all(reports.admins.map((admin) => getAdminFinanceSummary(String(admin.telegram_user_id))));
  const today = new Date().toISOString().slice(0, 10);

  return <AdminShell title="المالية والمدفوعات" description="Supabase هو مصدر الأرقام. Google Sheets يستقبل تقارير مشتقة فقط.">
    <div className="grid gap-5">
      <form action={saveFinanceSettingsAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
        <h2 className="text-xl font-black">إعدادات Snapchat المالية</h2>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="USD/DZD" name="usdDzdRate" value={settings.usdDzdRate}/><Field label="يوم الدفع الشهري" name="paymentDay" value={settings.paymentDay}/><Field label="Google finance sheet ID" name="reportingSheetId" value={settings.reportingSheetId}/></div>
        <div className="grid gap-3 sm:grid-cols-2">{([1, 2, 3, 6, 12] as const).map((month) => <div key={month} className="grid grid-cols-2 gap-2"><Field label={`${month} months price DZD`} name={`price-${month}`} value={settings.plans[month].priceDzd}/><Field label={`${month} months commission DZD`} name={`commission-${month}`} value={settings.plans[month].commissionDzd}/></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">{snapchatCardTypes.map((card) => <Field key={card} label={`${cardLabel(card, "en")} USD cents`} name={`cost-${card}`} value={settings.cardCostsUsdCents[card]}/>)}</div>
        <button className="min-h-12 rounded-xl bg-tiger-ember font-black text-black">حفظ الإعدادات</button>
      </form>
      <section className="grid gap-3">
        {reports.admins.map((admin, index) => {
          const summary = summaries[index];
          return <article key={summary.adminId} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <div className="flex flex-wrap justify-between gap-2"><h2 className="font-black">{admin.first_name ?? admin.username ?? `Admin ${summary.adminId}`}</h2><p className="font-black text-tiger-gold">المتبقي: {summary.remainingDzd} DZD</p></div>
            <p className="mt-2 text-sm text-white/60">طلبات مكتملة: {summary.completedOrders} · عمولة: {summary.commissionDzd} · مدفوع: {summary.paidDzd} · تعديلات: {summary.adjustmentsDzd} · الدفع القادم: {summary.nextPaymentDate}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <form action={saveAdminPaymentScheduleAction} className="grid gap-2"><input type="hidden" name="adminId" value={summary.adminId}/><label className="text-xs text-white/60">بداية العمل<input required name="workStartedAt" type="date" defaultValue={admin.work_started_at ?? today} className="mt-1 min-h-11 w-full rounded-xl bg-black px-3"/></label><label className="text-xs text-white/60">موعد الدفع<input required name="nextPaymentDate" type="date" defaultValue={admin.next_payment_date ?? summary.nextPaymentDate} className="mt-1 min-h-11 w-full rounded-xl bg-black px-3"/></label><button className="min-h-11 rounded-xl border border-white/20">حفظ الموعد</button></form>
              <form action={addAdminAdjustmentAction} className="grid gap-2"><input type="hidden" name="adminId" value={summary.adminId}/><input required name="amountDzd" type="number" placeholder="+ / - DZD" className="min-h-11 rounded-xl bg-black px-3"/><input required name="reason" placeholder="Reason" className="min-h-11 rounded-xl bg-black px-3"/><button className="min-h-11 rounded-xl border border-white/20">إضافة/خصم</button></form>
              <form action={markAdminPaidAction} className="grid gap-2"><input type="hidden" name="adminId" value={summary.adminId}/><input required name="amountDzd" type="number" min="1" placeholder="Paid DZD" className="min-h-11 rounded-xl bg-black px-3"/><input name="note" placeholder="Note" className="min-h-11 rounded-xl bg-black px-3"/><button className="min-h-11 rounded-xl bg-emerald-500 font-black text-black">Mark paid</button></form>
            </div>
          </article>;
        })}
      </section>
      <form action={recordAdvertisingSpendAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:grid-cols-5">
        <label className="grid gap-1 text-sm font-bold text-white/75">تاريخ الإنفاق<input required name="spentOn" type="date" defaultValue={today} className="min-h-11 rounded-xl bg-black px-3 text-white"/></label>
        <label className="grid gap-1 text-sm font-bold text-white/75">المنصة<select name="platform" defaultValue="meta" className="min-h-11 rounded-xl bg-black px-3 text-white"><option value="meta">Meta</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="other">Other</option></select></label>
        <Field label="Campaign" name="campaign" value=""/><Field label="Spend DZD" name="amountDzd" value=""/><label className="grid gap-1 text-sm font-bold text-white/75">ملاحظة<input name="note" className="min-h-11 rounded-xl bg-black px-3 text-white"/></label>
        <button className="min-h-11 rounded-xl bg-tiger-ember font-black text-black sm:col-span-5">تسجيل إنفاق إعلاني</button>
      </form>
    </div>
  </AdminShell>;
}

function Field({ label, name, value }: { label: string; name: string; value: string | number }) { return <label className="grid gap-1 text-sm font-bold text-white/75">{label}<input required name={name} defaultValue={value} className="min-h-11 rounded-xl bg-black px-3 text-white"/></label>; }
