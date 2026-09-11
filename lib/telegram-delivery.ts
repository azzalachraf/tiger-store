import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { encryptRedeemCode, decryptRedeemCode } from "@/lib/snapchat-cards";

const currentUpdate = new AsyncLocalStorage<string>();
async function send(method: string, body: Record<string, unknown>) {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(10000) });
  if (!response.ok || !(await response.json()).ok) throw new Error("Telegram delivery failed.");
}
export async function telegramDelivery(method: string, body: Record<string, unknown>) {
  const requestKey = currentUpdate.getStore();
  if (!requestKey || method !== "sendMessage") return send(method,body);
  const client = getSupabaseServiceClient();
  const {data,error} = await client.from("telegram_delivery_jobs").insert({request_key:requestKey,payload_ciphertext:encryptRedeemCode(JSON.stringify({method,body}))}).select("id").single();
  if (error) throw new Error("Telegram outbox unavailable.");
  await send(method,body);
  const saved = await client.from("telegram_delivery_jobs").update({sent_at:new Date().toISOString()}).eq("id",data.id);
  if (saved.error) throw new Error("Telegram acknowledgement failed.");
}
export async function processTelegramUpdate(updateId: number, handler: () => Promise<void>) {
  const client = getSupabaseServiceClient();
  const key = `telegram:${updateId}`;
  const {error} = await client.from("operation_requests").insert({request_key:key});
  if (error) {
    if (error.code !== "23505") throw new Error("Telegram idempotency unavailable.");
    // Never re-run money/inventory mutations after an uncertain response.
    const {data:state} = await client.from("operation_requests").select("state").eq("request_key",key).single();
    if (state?.state === "processing" || state?.state === "delivering") return;
    const lease = await client.from("operation_requests").update({state:"delivering"}).eq("request_key",key).eq("state",state?.state).select("request_key").maybeSingle();
    if (!lease.data) return;
    try {
      const jobs = await client.from("telegram_delivery_jobs").select("id,payload_ciphertext").eq("request_key",key).is("sent_at",null).order("created_at").order("id");
      if (jobs.error) throw new Error("Telegram outbox unavailable.");
      for (const job of jobs.data ?? []) {
        const message = JSON.parse(decryptRedeemCode(job.payload_ciphertext)) as {method:string;body:Record<string,unknown>};
        await send(message.method,message.body);
        await client.from("telegram_delivery_jobs").update({sent_at:new Date().toISOString()}).eq("id",job.id);
      }
    } finally { await client.from("operation_requests").update({state:state?.state}).eq("request_key",key); }
    return;
  }
  try {
    await currentUpdate.run(key,handler);
    await client.from("operation_requests").update({state:"completed"}).eq("request_key",key);
  } catch {
    await client.from("operation_requests").update({state:"failed"}).eq("request_key",key);
    throw new Error("Telegram update requires retry or review.");
  }
}
