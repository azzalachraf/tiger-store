import { getMarketingConfig } from "@/lib/marketing-store";
export const runtime = "nodejs";
export async function GET() {
  try {
    const config = await getMarketingConfig();
    return Response.json({ pixelId: config.meta_pixel_enabled ? config.meta_pixel_id : "" },{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({pixelId:""},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
