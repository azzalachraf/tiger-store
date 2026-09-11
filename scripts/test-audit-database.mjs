// Real PostgreSQL (WASM), fresh in-memory database only. Never loads .env.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
  create schema storage; create table storage.buckets(id text primary key,name text,public boolean);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text); alter table storage.objects enable row level security;
  grant usage on schema public,storage to anon,authenticated,service_role;
  alter default privileges in schema public grant all on tables to service_role;
  create policy "Service role upload product images" on storage.objects for insert with check(bucket_id='product-images');
  create policy "Service role update product images" on storage.objects for update using(bucket_id='product-images');
  create policy "Service role delete product images" on storage.objects for delete using(bucket_id='product-images');`);
async function apply(file) {
  // PGlite has core gen_random_uuid; pgcrypto extension installation belongs to Supabase.
  await db.exec((await readFile(file,'utf8')).replace(/create extension if not exists pgcrypto;/gi,''));
}
await apply('supabase/schema.sql');
for (const name of ['2026-08-28-operations-foundation','2026-08-28-snapchat-redeem-operations','2026-08-28-snapchat-order-warranties','2026-08-28-finance-reporting','2026-08-29-owner-analytics-products','2026-08-29-permanent-order-delete','2026-08-29-product-checkout-links','2026-08-29-telegram-redeem-upload-sessions','2026-08-31-admin-credit-cycles','2026-08-31-tiger-new-sheet','2026-08-31-warranty-form-order-details','2026-09-03-external-orders-as-sales','2026-09-05-external-order-card-costs']) await apply(`supabase/migrations/${name}.sql`);
const migrations=['security','warranties','website-sales','delivery'];
for (let i=0;i<2;i++) for (const name of migrations) await apply(`supabase/migrations/2026-09-10-audit-${name}.sql`);
const one = async (sql,args=[]) => (await db.query(sql,args)).rows[0];
assert.equal((await db.query(`select * from pg_policies where schemaname='storage'`)).rows.length,0);
await db.exec(`set role anon`);
await assert.rejects(()=>db.query(`select * from public.legacy_warranty_claims`),/permission denied/);
await assert.rejects(()=>db.query(`select public.take_request_limit('forged',1,1)`),/permission denied/);
await db.exec(`reset role`);
await db.exec(`insert into products(id,slug,name) values('snapchat-plus','snapchat-plus','Snapchat Plus');
  insert into telegram_users(telegram_user_id,role,registration_id) values(1,'owner','TG-OWNER001'),(2,'admin','TG-ADMIN002');`);
const item={productId:'snapchat-plus',slug:'snapchat-plus',optionId:'12-months',duration:'12 months',price:2300,quantity:1};
async function order(id,total=2300,payment='BaridiMob',request=null) {
  await db.query(`insert into orders(id,products,total,"paymentMethod","createdAt",request_key,tracking_session_id) values($1,$2,$3,$4,now()::text,$5,'00000000-0000-4000-8000-000000000001')`,[id,JSON.stringify([item]),total,payment,request]);
}
await order('WEB-1',2300,'BaridiMob','checkout-one');
assert.equal((await one(`select count(*)::int n from notification_jobs`)).n,3);
assert.equal((await one(`select count(*)::int n from page_events where event_type='purchase_completed'`)).n,1);
await assert.rejects(()=>order('WEB-DUP',2300,'BaridiMob','checkout-one'),/unique constraint/);
for (const [id,type] of [[1,'inr_199'],[2,'inr_199']]) await db.query(`insert into redeem_cards(code_hash,code_ciphertext,card_type,source_row_key) values($1,'synthetic-ciphertext',$2,$3)`,[String(id).padStart(64,'0'),type,String(id)]);
const claims=await Promise.allSettled([1,2].map(admin=>db.query(`select * from claim_website_card('WEB-1',$1,12::smallint,'inr_199')`,[admin])));
assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);
const op=await one(`select id,admin_telegram_user_id,redeem_card_id from snapchat_operations where website_order_id='WEB-1'`);
await db.query(`select complete_website_sale($1,$2,'WEB-1',100,215,537,'TW-TEST001',$3,'fixture',372,now()+interval '372 days',true)`,[op.id,op.admin_telegram_user_id,'a'.repeat(64)]);
assert.deepEqual(await one(`select revenue_dzd,commission_dzd,card_cost_dzd,gross_profit_dzd from finance_sales where order_id='WEB-1'`),{revenue_dzd:2300,commission_dzd:100,card_cost_dzd:537,gross_profit_dzd:1663});
const submissions=await Promise.allSettled(['Flexy','Binance'].map(payment=>db.query(`select submit_snapchat_warranty_form_v2($1,'أحمد يوسف','fixture','Instagram','0550123456','fixture@example.test',$2)`,['a'.repeat(64),payment])));
assert.equal(submissions.filter(r=>r.status==='fulfilled').length,1);
assert.equal((await one(`select "paymentMethod" p,total from orders where id='WEB-1'`)).p,'Flexy');
assert.equal((await one(`select total from orders where id='WEB-1'`)).total,2380);
assert.equal((await one(`select revenue_dzd from finance_sales where order_id='WEB-1'`)).revenue_dzd,2380);
const pays=await Promise.allSettled(['one','two'].map(key=>db.query(`select record_admin_payment_atomic($1,100,'fixture',$2,1)`,[op.admin_telegram_user_id,key])));
assert.equal(pays.filter(r=>r.status==='fulfilled').length,1);
assert.equal((await one(`select count(*)::int n from admin_payments`)).n,1);
await db.query(`select record_admin_payment_atomic($1,100,'fixture','one',1)`,[op.admin_telegram_user_id]);
assert.equal((await one(`select count(*)::int n from admin_payments`)).n,1);
await order('LEGACY'); await db.exec(`update orders set status='delivered' where id='LEGACY'`);
const legacy=await Promise.all(['Original','Changed'].map(name=>one(`select claim_legacy_warranty($1,'LEGACY',$2,'0550123456','fixture@example.test') n`,['b'.repeat(64),name])));
assert.equal(legacy[0].n,legacy[1].n);
await db.query(`select delete_order_permanently('WEB-1')`);
await assert.rejects(()=>db.query(`update redeem_cards set status='available' where id=$1`,[op.redeem_card_id]),/cannot be restored/);
const rates=await Promise.all(Array.from({length:10},()=>one(`select take_request_limit('fixture',3,60) allowed`)));
assert.equal(rates.filter(r=>r.allowed).length,3);
assert.equal((await one(`select lease_daily_report('2026-09-09','{}') leased`)).leased,true);
assert.equal((await one(`select lease_daily_report('2026-09-09','{}') leased`)).leased,false);
await db.exec(`update daily_owner_reports set leased_until=null where report_date='2026-09-09'`);
assert.equal((await one(`select lease_daily_report('2026-09-09','{}') leased`)).leased,true);
await db.exec(`update daily_owner_reports set sent_at=now(),leased_until=null where report_date='2026-09-09'`);
assert.equal((await one(`select lease_daily_report('2026-09-09','{}') leased`)).leased,false);
await order('DISCOUNT',1000,'Flexy'); assert.equal((await one(`select total from orders where id='DISCOUNT'`)).total,850);
console.log('PASS PostgreSQL: repeatable migrations, permissions, website claim race, atomic sale, warranty replay, Flexy, payment race/replay, persistent legacy claims, permanent redemption, rate limit, authoritative conversions, daily retry.');
await db.close();
