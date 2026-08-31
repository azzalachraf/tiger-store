import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getTrafficOverview } from "@/lib/page-events";
import { resolveTrafficRange } from "@/lib/traffic-range";

export const dynamic = "force-dynamic";
export const metadata = { title: "Traffic" };

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ range?: string; start?: string; end?: string }> }) {
  const query = await searchParams;
  const range = resolveTrafficRange(query);
  const today = resolveTrafficRange({}).end;
  const traffic = await getTrafficOverview(range);
  const metrics = [
    { label: "Website visitors", value: traffic.visitors.toLocaleString("en-US"), detail: "Unique browser sessions recorded on public pages.", icon: Users },
    { label: "Website conversions", value: traffic.conversions.toLocaleString("en-US"), detail: "Orders submitted successfully through checkout.", icon: CheckCircle2 },
    { label: "Conversion rate", value: `${traffic.conversionRate}%`, detail: "Conversions divided by recorded unique visitors.", icon: BarChart3 },
  ];

  return (
    <AdminShell title="Traffic" description="Choose a period to view website visitors and checkout conversions.">
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-tiger-gold" /> {range.label}: <span className="text-white/55">{range.start} → {range.end}</span></div><div className="flex flex-wrap gap-2"><RangeLink href="/admin/marketing/funnel?range=today" active={range.key === "today"}>Today</RangeLink><RangeLink href="/admin/marketing/funnel?range=7d" active={range.key === "7d"}>Last 7 days</RangeLink><RangeLink href="/admin/marketing/funnel?range=30d" active={range.key === "30d"}>Last 30 days</RangeLink></div></div>
        <form className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[1fr_1fr_auto]" method="get">
          <input type="hidden" name="range" value="custom" />
          <label className="grid gap-1 text-sm font-bold text-white/65">From<input required max={today} defaultValue={range.key === "custom" ? range.start : ""} name="start" type="date" className="min-h-11 rounded-xl border border-white/10 bg-black/35 px-3 font-bold text-white outline-none focus:border-tiger-ember" /></label>
          <label className="grid gap-1 text-sm font-bold text-white/65">To<input required max={today} defaultValue={range.key === "custom" ? range.end : ""} name="end" type="date" className="min-h-11 rounded-xl border border-white/10 bg-black/35 px-3 font-bold text-white outline-none focus:border-tiger-ember" /></label>
          <button className="min-h-11 self-end rounded-xl bg-tiger-ember px-5 font-black text-black">Apply range</button>
        </form>
      </section>
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
        Only events recorded during the selected period are included. Visitors are measured by a first-party browser session; no customer details are shown here.
      </p>
    </AdminShell>
  );
}

function RangeLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return <Link href={href} className={`inline-flex min-h-10 items-center rounded-xl border px-3 text-sm font-black ${active ? "border-tiger-ember bg-tiger-ember text-black" : "border-white/15 text-white hover:bg-white/10"}`}>{children}</Link>;
}
