import { getMarketingConfig } from "@/lib/marketing-store";
import { AdminShell } from "@/components/admin/AdminShell";
import { saveMarketingConfigAction } from "./actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meta Pixel & CAPI",
};

export default async function MetaPixelPage() {
  const config = await getMarketingConfig();

  return (
    <AdminShell title="Meta Tracking" description="Configure Meta Pixel (Client-side) and Conversions API (Server-side).">
      <form action={saveMarketingConfigAction} className="max-w-2xl space-y-8">
        
        {/* Pixel Config */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white">Meta Pixel</h2>
              <p className="text-sm text-white/50">Client-side browser tracking for standard events.</p>
            </div>
            <div className={`h-3 w-3 rounded-full ${config.meta_pixel_enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
          </div>
          
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white">Pixel ID</span>
              <input
                type="text"
                name="meta_pixel_id"
                defaultValue={config.meta_pixel_id || ""}
                placeholder="e.g. 123456789012345"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white placeholder:text-white/20 focus:border-tiger-gold focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="meta_pixel_enabled"
                defaultChecked={config.meta_pixel_enabled}
                className="h-5 w-5 rounded border-white/10 bg-black text-tiger-gold"
              />
              <span className="text-sm font-bold text-white">Enable Client-side Pixel Tracking</span>
            </label>
          </div>
        </section>

        {/* CAPI Config */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white">Conversions API (CAPI)</h2>
              <p className="text-sm text-white/50">Server-side tracking for ad blockers and iOS 14+.</p>
            </div>
            <div className={`h-3 w-3 rounded-full ${config.meta_capi_enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
          </div>
          
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white">Access Token</span>
              <input
                type="password"
                name="meta_capi_token"
                defaultValue={config.meta_capi_token || ""}
                placeholder="EAA..."
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white placeholder:text-white/20 focus:border-tiger-gold focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="meta_capi_enabled"
                defaultChecked={config.meta_capi_enabled}
                className="h-5 w-5 rounded border-white/10 bg-black text-tiger-gold"
              />
              <span className="text-sm font-bold text-white">Enable Server-side CAPI Tracking</span>
            </label>
          </div>
        </section>

        <Button type="submit" className="bg-tiger-gold text-black hover:bg-tiger-ember px-8 py-2 text-lg">
          Save Configuration
        </Button>
      </form>
    </AdminShell>
  );
}
