// Execute production modules against isolated services; no production environment.
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const state={tables:{},product:null,productError:null,sendFailure:false,sends:0};
globalThis.__auditRuntime=state;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{state.sends++;if(state.sendFailure)throw new Error('synthetic network failure');return Response.json({ok:true});};
const supabase=`const s=globalThis.__auditRuntime;
export function getSupabaseServiceClient(){return {from(table){
  const filters=[];let op='select',value;
  const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>r[k]===v||v===null&&r[k]===undefined);return q},order(){return q},
  insert(v){op='insert';value=v;return q},update(v){op='update';value=v;return q},single(){return run(true)},maybeSingle(){return run(true)},then(a,b){return run(false).then(a,b)}};
  async function run(single){
    if(table==='products')return {data:s.product,error:s.productError};
    const rows=s.tables[table]??=[];let result=[];
    if(op==='insert'){
      if(table==='operation_requests'&&rows.some(r=>r.request_key===value.request_key))return {data:null,error:{code:'23505'}};
      const row={id:String(rows.length+1),state:'processing',...value};rows.push(row);result=[row];
    }else{result=rows.filter(r=>filters.every(f=>f(r)));if(op==='update')result.forEach(r=>Object.assign(r,value));}
    return {data:single?result[0]??null:result,error:null};
  }return q;
}};}`;
const mocks={
  'server-only':'',
  '@/lib/supabase':supabase,
  '@/lib/env':`export const getEncryptionSecret=()=> 'synthetic-encryption-key-for-tests-only';export const getServerEnv=()=>({TELEGRAM_BOT_TOKEN:'synthetic-token'});`,
  '@/lib/logger':`export const logger={error(){},warn(){},info(){}};`,
};
const dir=await mkdtemp(join(tmpdir(),'tiger-audit-runtime-'));
for(const [name,path] of [['delivery','lib/telegram-delivery.ts'],['catalog','lib/admin-store.ts']]){
  await build({entryPoints:[path],outfile:join(dir,name+'.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'isolated',setup(b){
    b.onResolve({filter:/.*/},a=>Object.hasOwn(mocks,a.path)?{path:a.path,namespace:'mock'}:undefined);
    b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));
  }}]});
}
// Locate regular dependencies from the repository, not the OS temp folder.
// Bundling zod avoids external runtime resolution from temp.
await build({entryPoints:['lib/admin-store.ts'],outfile:join(dir,'catalog.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'isolated',setup(b){b.onResolve({filter:/.*/},a=>Object.hasOwn(mocks,a.path)?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
const delivery=await import(pathToFileURL(join(dir,'delivery.mjs')));
const catalog=await import(pathToFileURL(join(dir,'catalog.mjs')));
assert.equal(await catalog.getProductBySlug('snapchat-plus'),undefined);
assert.equal(await catalog.getProductById('snapchat-plus'),undefined);
state.productError={message:'synthetic outage'};
await assert.rejects(()=>catalog.getProductBySlug('snapchat-plus'),/Catalogue unavailable/);
state.productError=null;state.product={id:'snapchat-plus'};
await assert.rejects(()=>catalog.getProductBySlug('snapchat-plus'),/invalid/);
let effects=0;
await Promise.all(Array.from({length:8},()=>delivery.processTelegramUpdate(10,async()=>{effects++;await delivery.telegramDelivery('sendMessage',{chat_id:'1',text:'synthetic-private-link'});} )));
assert.equal(effects,1);
assert.equal(state.sends,1);
assert.ok(!JSON.stringify(state.tables).includes('synthetic-private-link'));
state.sendFailure=true;
await assert.rejects(()=>delivery.processTelegramUpdate(11,async()=>{effects++;await delivery.telegramDelivery('sendMessage',{chat_id:'1',text:'synthetic-retry-link'});}),/retry or review/);
state.sendFailure=false;
await delivery.processTelegramUpdate(11,async()=>{effects++;});
assert.equal(effects,2,'retry must not repeat mutations');
assert.equal(state.tables.telegram_delivery_jobs.filter(r=>r.sent_at).length,2);
globalThis.fetch=originalFetch;
console.log('PASS: missing/invalid/offline catalog fails closed; eight duplicate updates perform one mutation; encrypted outbox retries delivery without replaying mutations.');
