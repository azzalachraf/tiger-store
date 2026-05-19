import { getSettings } from "@/lib/admin-store";
import { saveSettingsAction } from "@/app/admin/settings/actions";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Payment",
};

export default async function AdminPaymentMethodsPage() {
  const settings = await getSettings();

  return (
    <AdminShell title="طرق الدفع" description="تعديل تفاصيل الدفع التي تظهر للعميل في checkout وصفحات الدفع.">
      <form action={saveSettingsAction} className="grid gap-4">
        <input type="hidden" name="whatsappNumber" value={settings.whatsappNumber} />
        <input type="hidden" name="instagramUrl" value={settings.instagramUrl} />
        <input type="hidden" name="facebookUrl" value={settings.facebookUrl} />
        <input type="hidden" name="domainText" value={settings.domainText} />
        <input type="hidden" name="promoHeadings" value={settings.promoHeadings.join("\n")} />
        <input type="hidden" name="footerDisclaimer" value={settings.footerDisclaimer} />
        <PaymentAdminCard name="BaridiMob RIP" field="baridiMobRip" value={settings.baridiMobRip} />
        <PaymentAdminCard name="CCP" field="ccpDetails" value={settings.ccpDetails} textarea />
        <PaymentAdminCard name="RedotPay" field="redotPayDetails" value={settings.redotPayDetails} textarea />
        <button type="submit" className="min-h-12 rounded-xl bg-tiger-ember px-5 font-extrabold text-black">
          حفظ طرق الدفع
        </button>
      </form>
    </AdminShell>
  );
}

function PaymentAdminCard({ name, field, value, textarea }: { name: string; field: string; value: string; textarea?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <h2 className="text-xl font-extrabold text-white">{name}</h2>
      {textarea ? (
        <textarea name={field} defaultValue={value} className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none" />
      ) : (
        <input name={field} defaultValue={value} className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-white outline-none" />
      )}
    </div>
  );
}
