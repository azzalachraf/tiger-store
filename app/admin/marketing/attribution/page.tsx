import { getAttributionData } from "@/lib/page-events";
import { formatCurrency } from "@/lib/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import { Target, Share2, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UTM Attribution",
};

export default async function AttributionPage() {
  const data = await getAttributionData();

  const isEmpty = data.bySource.length === 0 && data.byCampaign.length === 0 && data.byMedium.length === 0;

  return (
    <AdminShell title="UTM Attribution" description="Track revenue by source, medium, and campaign.">
      {isEmpty ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-12 text-center text-white/50">
          <Target className="mx-auto h-12 w-12 text-white/20 mb-4" />
          <p className="text-lg font-bold">No attribution data yet.</p>
          <p className="text-sm mt-2">Use UTM parameters in your marketing links (e.g., ?utm_source=facebook&utm_campaign=summer_sale) to see tracking data here.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* By Source */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 mb-6">
              <Share2 className="h-5 w-5 text-tiger-gold" />
              <h2 className="text-xl font-extrabold text-white">By Source</h2>
            </div>
            <div className="space-y-4">
              {data.bySource.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-white/50">{item.count} orders</p>
                  </div>
                  <p className="font-extrabold text-emerald-400">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By Campaign */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 mb-6">
              <Megaphone className="h-5 w-5 text-tiger-gold" />
              <h2 className="text-xl font-extrabold text-white">By Campaign</h2>
            </div>
            <div className="space-y-4">
              {data.byCampaign.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-white/50">{item.count} orders</p>
                  </div>
                  <p className="font-extrabold text-emerald-400">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
              {data.byCampaign.length === 0 && <p className="text-white/40 text-sm">No campaign data.</p>}
            </div>
          </div>

          {/* By Medium */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="h-5 w-5 text-tiger-gold" />
              <h2 className="text-xl font-extrabold text-white">By Medium</h2>
            </div>
            <div className="space-y-4">
              {data.byMedium.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-white/50">{item.count} orders</p>
                  </div>
                  <p className="font-extrabold text-emerald-400">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
              {data.byMedium.length === 0 && <p className="text-white/40 text-sm">No medium data.</p>}
            </div>
          </div>

        </div>
      )}
    </AdminShell>
  );
}
