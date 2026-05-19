import { getSettings } from "@/lib/admin-store";
import { saveSettingsAction } from "@/app/admin/settings/actions";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Settings",
};

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <AdminShell title="Settings" description="Edit global site settings, contact details, and homepage text.">
      <form action={saveSettingsAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
        <AdminField name="domainText" label="Domain text" defaultValue={settings.domainText} />
        <AdminField name="whatsappNumber" label="Order destination number" defaultValue={settings.whatsappNumber} />
        <AdminField name="instagramUrl" label="Instagram URL" defaultValue={settings.instagramUrl} />
        <AdminField name="facebookUrl" label="Facebook URL" defaultValue={settings.facebookUrl} />
        <AdminField name="baridiMobRip" label="BaridiMob RIP" defaultValue={settings.baridiMobRip} />
        <TextArea name="ccpDetails" label="CCP details" defaultValue={settings.ccpDetails} />
        <TextArea name="redotPayDetails" label="RedotPay details" defaultValue={settings.redotPayDetails} />
        <TextArea name="promoHeadings" label="Homepage promo headings - one per line" defaultValue={settings.promoHeadings.join("\n")} />
        <TextArea name="footerDisclaimer" label="Footer disclaimer" defaultValue={settings.footerDisclaimer} />
        <button type="submit" className="min-h-12 rounded-xl bg-tiger-ember font-black text-black">
          Save Settings
        </button>
      </form>
    </AdminShell>
  );
}

function AdminField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white">
      {label}
      <input name={name} defaultValue={defaultValue} className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none" />
    </label>
  );
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white">
      {label}
      <textarea name={name} defaultValue={defaultValue} className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none" />
    </label>
  );
}
