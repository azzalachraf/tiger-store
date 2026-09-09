// Offline component integration tests: server actions are replaced before bundling.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Achraff/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const output = await mkdtemp(join(tmpdir(), "tiger-admin-ui-"));
await build({
  entryPoints: ["scripts/admin-ui-fixture.tsx"],
  bundle: true,
  outfile: join(output, "app.js"),
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "offline-admin",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve(
          { filter: /^@\/app\/admin\/.*\/(actions|receipt)$/ },
          (a) => ({ path: a.path, namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          loader: "js",
          resolveDir: process.cwd(),
          contents:
            a.path === "next/navigation"
              ? `export const usePathname=()=>'/admin';export const useRouter=()=>({refresh(){}});`
              : a.path === "next/link"
                ? `import React from 'react';export default function Link({prefetch,...p}){return React.createElement('a',p);}`
                : a.path === "next/image"
                  ? `import React from 'react';export default function Image(p){return React.createElement('img',p);}`
                  : a.path.endsWith("/receipt")
                    ? `export const loadPrivateReceipt=async()=>'/fixture.svg';`
                    : `const run=name=>async data=>{if(window.failAction)throw new Error('private-error');window.calls.push({name,data:Object.fromEntries(data)});};${["saveOrderStatusAction", "deleteOrderAction", "createWarrantyLinkAction", "saveProductAction", "deleteProductAction", "saveAccountAction", "deleteAccountAction", "importAccountsAction", "addRedeemCardsAction", "markRedeemCardUsedAction", "removeRedeemCardAction", "restoreRedeemCardAction", "renameTelegramAdminAction", "disableTelegramAdminAction"].map((n) => `export const ${n}=run('${n}');`).join("")}`,
        }));
      },
    },
  ],
});
execFileSync(
  process.execPath,
  [
    require.resolve("tailwindcss/lib/cli.js"),
    "-i",
    "app/globals.css",
    "-o",
    join(output, "base.css"),
    "--content",
    "components/admin/**/*.tsx,scripts/admin-ui-fixture.tsx",
  ],
  { stdio: "pipe" },
);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Cache-Control", "no-store");
  if (path === "/fixture.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect width="100" height="120" rx="16" fill="#ffce00"/><text x="15" y="65" font-size="22">TEST</text></svg>',
    );
    return;
  }
  if (["/app.js", "/app.css", "/base.css"].includes(path)) {
    res.setHeader(
      "Content-Type",
      path.endsWith("js") ? "application/javascript" : "text/css",
    );
    res.end(await readFile(join(output, path.slice(1))));
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  for (const width of [380, 1440])
    for (const lang of ["ar", "en"])
      for (const dark of [false, true])
        for (const view of [
          "overview",
          "orders",
          "products",
          "editor",
          "customers",
          "accounts",
          "finance",
          "stock",
          "team",
          "sheet",
        ]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(origin + "/?view=" + view);
          await page.evaluate(
            ({ lang, dark }) => {
              document.documentElement.lang = lang;
              document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
              document.documentElement.classList.toggle("dark", dark);
            },
            { lang, dark },
          );
          await page.locator("h1").waitFor();
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${view} overflow ${width} ${lang} ${dark}`,
          );
          if (lang === "en" && dark)
            await page.screenshot({
              path: join(output, view + "-" + width + ".png"),
              fullPage: true,
            });
        }
  await page.setViewportSize({ width: 380, height: 900 });
  await page.goto(origin + "/?view=orders");
  await page.getByRole("button", { name: "More", exact: true }).click();
  assert.ok(
    await page.locator("#admin-menu").evaluate((e) => e.matches(":modal")),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#admin-menu").isVisible(), false);
  await page.getByRole("searchbox", { name: "Search orders" }).fill("TEST-30");
  assert.equal(await page.locator(".admin-order-card").count(), 1);
  await page.locator("summary").click();
  await page.getByLabel("Admin notes").fill("Updated note");
  await page.getByRole("button", { name: "Save order", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 1);
  assert.equal(
    await page.evaluate(() => window.calls[0].data.adminNotes),
    "Updated note",
  );
  await page
    .getByRole("button", { name: "Permanently delete order", exact: true })
    .click();
  assert.equal(await page.evaluate(() => window.calls.length), 1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.evaluate(() => window.calls.length), 1);
  await page.getByRole("button", { name: "Create warranty link" }).click();
  await page.waitForFunction(() => window.calls.length === 2);
  await page.getByRole("searchbox", { name: "Search orders" }).fill("");
  await page
    .getByRole("checkbox", { name: "Select orders on current page" })
    .check();
  await page.getByRole("button", { name: "Update selected" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 12);
  assert.equal(
    await page.evaluate(() => window.calls.at(-1).data.adminNotes),
    "Retain this note",
  );
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  assert.match(
    await page.locator(".admin-pagination").innerText(),
    /11–20 of 31/,
  );
  await page.goto(origin + "/?view=products");
  await page.getByRole("searchbox").fill("Product 23");
  assert.equal(await page.locator("tbody tr").count(), 1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  assert.equal((await download).suggestedFilename(), "tiger-products.csv");
  await page.goto(origin + "/?view=editor");
  await page
    .getByLabel("Product name", { exact: false })
    .fill("Changed fixture");
  await page.getByLabel("Base price (DA)", { exact: false }).fill("2400");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 1);
  const saved = await page.evaluate(() => window.calls[0].data);
  assert.equal(saved.name, "Changed fixture");
  assert.equal(JSON.parse(saved.priceOptions)[0].compatibilityEn, "iPhone");
  assert.equal(JSON.parse(saved.priceOptions)[0].labelAr, "عام كامل");
  await page.getByRole("button", { name: "Add plan", exact: true }).click();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  assert.equal(await page.evaluate(() => window.calls.length), 1);
  await page
    .getByRole("button", { name: "Remove plan", exact: true })
    .last()
    .evaluate((e) => {
      window.confirm = () => true;
      e.click();
    });
  await page.goto(origin + "/?view=action");
  await page.getByLabel("Test input").fill("Keep my entry");
  await page.evaluate(() => (window.failAction = true));
  await page.getByRole("button", { name: "Save test" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByLabel("Test input").inputValue(),
    "Keep my entry",
  );
  assert.ok(
    !(await page.locator("body").innerText()).includes("secret-must-not-leak"),
  );
  await page.evaluate(() => (window.failAction = false));
  await page.getByRole("button", { name: "Save test" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 1);
  await page.goto(origin + "/?view=team");
  assert.equal(
    await page
      .getByRole("button", { name: "Disable access", exact: true })
      .count(),
    2,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Disable access", exact: true })
      .last()
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Disable access", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await page
    .getByRole("button", { name: "Disable access", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 1);
  assert.equal(
    await page.evaluate(() => window.calls[0].data.telegramUserId),
    "12345",
  );
  await page.goto(origin + "/?view=stock");
  await page.getByLabel("Status", { exact: true }).selectOption("reserved");
  assert.equal(
    await page.getByRole("button", { name: "Mark used", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Restore to stock", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Status", { exact: true }).selectOption("consumed");
  assert.equal(
    await page
      .getByRole("button", { name: "Restore to stock", exact: true })
      .count(),
    1,
  );
  await page.getByLabel("Status", { exact: true }).selectOption("available");
  await page
    .getByRole("searchbox", { name: "Find card" })
    .fill("SYNTHETIC-CARD-30");
  assert.equal(
    await page.getByRole("button", { name: "Mark used", exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "Mark used", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => window.calls.length === 1);
  assert.equal(
    await page.evaluate(() => window.calls[0].data.cardId),
    "card-30",
  );
  await page.goto(origin + "/?view=finance");
  await page.getByLabel("Sales by admin").selectOption("admin-a");
  assert.ok(!(await page.locator("tbody").innerText()).includes("Sara"));
  let copyRequests = 0;
  await page.route("**/api/admin/tiger-new-sheet/copy", async (route) => {
    copyRequests++;
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ copiedOrderIds: body.orderIds }),
    });
  });
  await page.goto(origin + "/?view=sheet");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value) => {
          window.clipboardFixture = value;
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("searchbox", { name: "Search sheet" }).fill("TEST-30");
  await page
    .getByRole("button", { name: "Copy new rows (1)", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.body.textContent.includes("1 rows copied."),
  );
  assert.equal(copyRequests, 1);
  assert.equal(await page.locator("tbody tr").count(), 1);
  const cells = (await page.evaluate(() => window.clipboardFixture)).split(
    String.fromCharCode(9),
  );
  assert.equal(cells.length, 10);
  assert.equal(cells[5], "");
  assert.equal(cells[6], "");
  await page
    .getByRole("button", { name: "Copy again (no status change)", exact: true })
    .click();
  assert.equal(copyRequests, 1);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "Copy again (no status change)", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.equal(copyRequests, 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 80 mobile/desktop Arabic/English theme layouts; search, paging, export, modal navigation, order save/bulk/warranty, delete cancellation, product field preservation, validation and failure/retry. Synthetic actions only.",
  );
  console.log("Visual artifacts: " + output);
} finally {
  await browser.close();
  server.close();
}
