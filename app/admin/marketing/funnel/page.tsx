import { BarChart3, CheckCircle2, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getTrafficOverview } from "@/lib/page-events";

export const dynamic = "force-dynamic";
export const metadata = { title: "Traffic" };

export default async function FunnelPage() {
  const traffic = await getTrafficOverview();
  const metrics = [
    { label: "Website visitors", value: traffic.visitors.toLocaleString("en-US"), detail: "Unique browser sessions recorded on public pages.", icon: Users },
    { label: "Website conversions", value: traffic.conversions.toLocaleString("en-US"), detail: "Orders submitted successfully through checkout.", icon: CheckCircle2 },
    { label: "Conversion rate", value: `${traffic.conversionRate}%`, detail: "Conversions divided by recorded unique visitors.", icon: BarChart3 },
  ];

  return (
    <AdminShell title="Traffic" description="A simple view of website visitors and completed checkout submissions.">
      <section className="grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <Icon className="h-5 w-5 text-tiger-gold" />
            <p className="mt-5 text-sm font-bold text-white/55">{label}</p>
            <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
            <p className="mt-3 text-sm leading-6 text-white/55">{detail}</p>
          </article>
        ))}
      </section>
      <p className="mt-5 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
        Traffic begins counting after this version is live. Visitors are measured by a first-party browser session; no customer details are shown here.
      </p>
    </AdminShell>
  );
}
