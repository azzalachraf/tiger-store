import { getFunnelData } from "@/lib/page-events";
import { AdminShell } from "@/components/admin/AdminShell";
import { Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Funnel",
};

export default async function FunnelPage() {
  const funnel = await getFunnelData();
  const maxCount = funnel.length > 0 ? funnel[0].count : 1;

  return (
    <AdminShell title="Sales Funnel" description="Analyze user journey drop-off rates.">
      <div className="max-w-4xl mx-auto mt-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8">
          <div className="flex items-center gap-3 mb-8">
            <Filter className="h-6 w-6 text-tiger-gold" />
            <h2 className="text-xl font-extrabold text-white">Conversion Funnel</h2>
          </div>

          <div className="space-y-6">
            {funnel.map((step, i) => {
              const width = Math.max((step.count / maxCount) * 100, 2); // min 2% width for visibility
              return (
                <div key={step.label} className="relative">
                  <div className="flex items-end justify-between mb-2">
                    <span className="font-bold text-white text-lg">{step.label}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-tiger-gold text-xl">{step.count.toLocaleString()}</span>
                      <span className="text-white/50 text-sm ml-2">({step.percentage}%)</span>
                    </div>
                  </div>
                  
                  {/* Funnel Bar */}
                  <div className="h-12 w-full bg-black rounded-xl overflow-hidden flex items-center justify-center relative">
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 bg-gradient-to-r from-tiger-ember to-tiger-gold rounded-xl transition-all duration-1000"
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  {/* Drop-off indicator */}
                  {i < funnel.length - 1 && step.count > 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                      <div className="w-px h-6 bg-white/20"></div>
                      {funnel[i+1].dropOff > 0 && (
                        <span className="text-xs font-bold text-red-400 bg-[#0a0a0a] px-2 py-0.5 rounded-full border border-red-500/20 absolute top-1/2 -translate-y-1/2 ml-16 whitespace-nowrap">
                          -{funnel[i+1].dropOff}% drop
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {funnel[0].count === 0 && (
            <div className="text-center py-12 text-white/50">
              No funnel events recorded yet. Make sure the pixel and tracker are working.
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
