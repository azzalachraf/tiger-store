import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getOrderById } from "@/lib/admin-store";
import { notifyOwnerOfReceipt } from "@/lib/whatsapp-notifications";
import { notifyTelegramOfOrder } from "@/lib/telegram-notifications";
import { getMarketingConfig } from "@/lib/marketing-store";
import { sendConversionEvent } from "@/lib/meta-capi";
import { absoluteUrl } from "@/lib/seo";

export async function deliverNotificationJobs() {
  const client = getSupabaseServiceClient();
  const { data, error } = await client.rpc("lease_notification_jobs");
  if (error) throw new Error("Notification queue unavailable.");
  for (const job of (data ?? []) as { id: string; order_id: string; channel: string }[]) {
    try {
      const order = await getOrderById(job.order_id);
      if (!order) throw new Error("Order unavailable.");
      if (job.channel === "whatsapp") await notifyOwnerOfReceipt(order, true);
      if (job.channel === "telegram") await notifyTelegramOfOrder(order, true);
      if (job.channel === "meta") {
        const config = await getMarketingConfig();
        if (config.meta_capi_enabled) {
          const result = await sendConversionEvent({ pixelId: config.meta_pixel_id, accessToken: config.meta_capi_token, eventName: "Purchase", eventId: `purchase:${order.id}`, sourceUrl: absoluteUrl("/checkout"), phone: order.phone, value: order.total, orderId: order.id, contentIds: order.products.map(p=>p.productId), numItems: order.products.reduce((n,p)=>n+p.quantity,0) });
          if (!result.success) throw new Error("Conversion delivery failed.");
        }
      }
      await client.from("notification_jobs").update({sent_at:new Date().toISOString(),leased_until:null}).eq("id",job.id);
    } catch {
      // Keep the lease as bounded backoff. Neither customer data nor credentials are logged.
    }
  }
}
