import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtemp,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Achraff/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=await mkdtemp(join(tmpdir(),'tiger-audit-ui-'));
await build({entryPoints:['scripts/audit-ui-fixture.tsx'],outfile:join(output,'app.js'),bundle:true,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture',setup(b){
  b.onResolve({filter:/^next\/(image|link|navigation)$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'js',resolveDir:process.cwd(),contents:a.path==='next/navigation'?`export const useRouter=()=>({refresh(){}});`:a.path==='next/link'?`import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props);}`:`import React from 'react';export default function Image({fill,priority,...props}){return React.createElement('img',{...props,src:'/fixture.svg'});}`}));
}}]});
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','app/globals.css','-o',join(output,'base.css'),'--content','components/**/*.tsx,app/w/**/*.tsx,scripts/audit-ui-fixture.tsx'],{stdio:'pipe'});
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/fixture.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="orange"/></svg>');return;}
  if(['/app.js','/base.css'].includes(path)){res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':'text/css');res.end(await readFile(join(output,path.slice(1))));return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 let count=0;
 for(const width of [380,1440])for(const lang of ['ar','fr','en'])for(const dark of [0,1]){
  await page.setViewportSize({width,height:900});
  await page.goto(`${origin}/?lang=${lang}&dark=${dark}`);await page.locator('h1').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(dark){
    const contrast=await page.locator('section > article h2, section > article p').evaluateAll(nodes=>nodes.map(node=>{
      let parent=node;let bg='rgba(0, 0, 0, 0)';while(parent&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(parent).backgroundColor;parent=parent.parentElement;}
      const lum=s=>{const c=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
      const a=lum(getComputedStyle(node).color),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    }));
    assert.equal(contrast.length,4);
    assert.ok(contrast.every(n=>n>=4.5),`policy contrast ${contrast}`);
  }
  await page.screenshot({path:join(output,`product-${width}-${lang}-${dark}.png`),fullPage:true});
  await page.goto(`${origin}/?view=warranty&lang=${lang}&dark=${dark}`);await page.locator('select').waitFor();
  assert.equal(await page.getByRole('button',{name:'Vérifier',exact:true}).isDisabled(),true);
  await page.locator('input').nth(0).fill('أحمد يوسف');await page.locator('input').nth(1).fill('fixture_user');
  await page.locator('input[type=tel]').fill('0550123456');await page.locator('input[type=email]').fill('fixture@example.test');
  assert.equal(await page.getByRole('button',{name:'Vérifier',exact:true}).isDisabled(),true);
  await page.locator('select').selectOption('Flexy');await page.getByRole('button',{name:'Vérifier',exact:true}).click();
  await page.getByRole('button',{name:'Confirmer',exact:true}).waitFor();
  assert.equal(await page.locator('input[name=paymentMethod]').inputValue(),'Flexy');
  await page.getByRole('button',{name:'Confirmer',exact:true}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.submitted==='Flexy');
  count++;
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${count} product/warranty mobile/desktop locale/theme combinations, contrast, required payment and review/confirmation. Artifacts: ${output}`);
}finally{await browser.close();server.close();}
