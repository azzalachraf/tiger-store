// Synthetic browser fixture. Bundled only by test-admin-ui.mjs; never a public route.
import { createRoot } from "react-dom/client";
import { Overview } from "../components/admin/Overview";
import { FinancialResult } from "../components/admin/FinancialResult";
import { OrdersWorkspace } from "../components/admin/OrdersWorkspace";
import { ProductsWorkspace } from "../components/admin/ProductsWorkspace";
import { ProductForm } from "../components/admin/ProductForm";
import { AdminNavigation } from "../components/admin/AdminNavigation";
import { ActionForm } from "../components/admin/ActionForm";
import { CustomersWorkspace } from "../components/admin/CustomersWorkspace";
import { AccountsTable } from "../components/admin/AccountsTable";
import { FinanceLedger } from "../components/admin/FinanceLedger";
import { StockWorkspace } from "../components/admin/StockWorkspace";
import { TeamWorkspace } from "../components/admin/TeamWorkspace";
import { TigerNewSheetCopy } from "../components/admin/TigerNewSheetCopy";
import { ReportRangeControls } from "../components/admin/ReportRangeControls";
import type { AdminOrder, Product } from "../lib/types";
import "../components/admin/admin.css";
declare global {
  interface Window {
    calls: { name: string; data: Record<string, FormDataEntryValue> }[];
    failAction: boolean;
  }
}
window.calls = [];
window.failAction = false;
const product: Product = {
  id: "fixture-product",
  slug: "fixture-product",
  name: "Snapchat Plus",
  nameAr: "سناب شات بلس",
  category: "social",
  categoryAr: "تواصل",
  price: 2300,
  currency: "DZD",
  duration: "12 months",
  durationAr: "عام كامل",
  shortDescriptionAr: "منتج للاختبار فقط",
  shortDescriptionEn: "Synthetic test product",
  featuresAr: ["اختبار"],
  featuresEn: ["Fixture"],
  activationTypeAr: "اختبار",
  activationTypeEn: "Test",
  image: "/fixture.svg",
  available: true,
  featured: true,
  priceOptions: [
    {
      id: "plan-1",
      label: "12 months",
      labelAr: "عام كامل",
      duration: "12 months",
      durationAr: "عام كامل",
      price: 2300,
      available: true,
      compatibilityAr: "آيفون",
      compatibilityEn: "iPhone",
    },
  ],
};
const orders: AdminOrder[] = Array.from({ length: 31 }, (_, i) => ({
  id: "TEST-" + i,
  customerName: i % 2 ? "عميل تجريبي " + i : "Test client " + i,
  phone: "0555000000",
  email: "fixture" + i + "@example.test",
  products: [
    {
      id: "line-" + i,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameAr: product.nameAr,
      image: product.image,
      option: "12 months",
      optionId: "plan-1",
      optionAr: "عام كامل",
      duration: "12 months",
      durationAr: "عام كامل",
      price: 2300,
      quantity: 1,
    },
  ],
  paymentMethod: "Binance",
  total: 2300,
  status: i % 3 ? "pending" : "delivered",
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  receiptPath: "fixture.png",
  adminNotes: "Retain this note",
}));
const view = new URLSearchParams(location.search).get("view") ?? "overview";
const views: Record<string, React.ReactNode> = {
  finance: (
    <>
      <ReportRangeControls
        value={{
          range: "month",
          start: "2026-09-01",
          end: "2026-09-09",
          invalid: false,
        }}
      />
      <FinanceLedger
        sales={orders.map((o, i) => ({
          id: o.id,
          adminId: i % 2 ? "admin-a" : "admin-b",
          admin: i % 2 ? "Lalo" : "Sara",
          plan: i % 2 ? 1 : 12,
          date: o.createdAt,
          revenue: 2300,
          cost: 135,
          credit: 100,
        }))}
        spend={[]}
      />
    </>
  ),
  stock: (
    <StockWorkspace
      cards={Array.from({ length: 31 }, (_, i) => ({
        id: "card-" + i,
        type: i % 2 ? "try_24" : "inr_199",
        code: "SYNTHETIC-CARD-" + i,
        status:
          i % 3 === 0 ? "available" : i % 3 === 1 ? "consumed" : "reserved",
        mutable: i % 3 === 0,
        canRestore: i === 1,
      }))}
    />
  ),
  team: (
    <TeamWorkspace
      members={[
        {
          id: "999",
          name: "Owner",
          username: "owner",
          role: "owner",
          active: 0,
        },
        {
          id: "12345",
          name: "Lalo",
          username: "lalo",
          role: "admin",
          active: 0,
        },
        {
          id: "12346",
          name: "Sara",
          username: "sara",
          role: "admin",
          active: 2,
        },
        {
          id: "12347",
          name: "Former admin",
          username: "former",
          role: "pending",
          active: 0,
        },
      ]}
    />
  ),
  sheet: (
    <TigerNewSheetCopy
      initialData={{
        rows: orders.map((o, i) => ({
          orderId: o.id,
          orderStatus: o.status === "delivered" ? "completed" : "pending",
          missingDetails: i % 2 === 0,
          copied: i === 0,
          client: o.customerName,
          subscription: "Snapchat Plus",
          duration: "12 months",
          costPrice: "135",
          amountPaid: "2300",
          spend: "",
          cost: "",
          netProfit: "2065",
          paymentMethod: "Binance",
          admin: i % 2 ? "Lalo" : "Sara",
        })),
        totals: {
          all: 31,
          completed: 11,
          pending: 20,
          cancelled: 0,
          missingDetails: 16,
          copied: 1,
          uncopied: 30,
        },
      }}
      dates={Object.fromEntries(orders.map((o) => [o.id, o.createdAt]))}
    />
  ),
  statistics: (
    <FinancialResult
      sales={orders.map((o) => ({
        id: o.id,
        adminId: "fixture",
        admin: "Test",
        plan: 12,
        date: o.createdAt,
        revenue: 2300,
        cost: 135,
        credit: 100,
      }))}
      spend={[]}
      charts
      monthly
    />
  ),
  overview: (
    <Overview
      orders={orders}
      availableProducts={24}
      sales={orders.map((o) => ({
        id: o.id,
        adminId: "fixture",
        admin: "Test",
        plan: 12,
        date: o.createdAt,
        revenue: 2300,
        cost: 135,
        credit: 100,
      }))}
      spend={[]}
    />
  ),
  orders: <OrdersWorkspace orders={orders} />,
  products: (
    <ProductsWorkspace
      products={Array.from({ length: 24 }, (_, i) => ({
        ...product,
        id: "fixture-" + i,
        name: "Product " + i,
      }))}
    />
  ),
  editor: (
    <ProductForm
      product={product}
      categories={[{ id: "social", name: { ar: "تواصل", en: "Social" } }]}
    />
  ),
  customers: (
    <CustomersWorkspace
      customers={orders.map((o) => ({
        name: o.customerName,
        email: o.email,
        orderCount: 1,
        totalSpent: 2300,
        averageOrderValue: 2300,
        isReturning: false,
        firstOrder: o.createdAt,
        lastOrder: o.createdAt,
      }))}
    />
  ),
  accounts: (
    <AccountsTable
      accounts={Array.from({ length: 21 }, (_, i) => ({
        id: "account-" + i,
        email: "fixture" + i + "@example.test",
        emailPassword: "synthetic",
        chatgptPassword: "synthetic",
        dateCreated: "2026-09-01",
        price: 100,
        status: "Available",
        updatedAt: "2026-09-01T12:00:00Z",
      }))}
    />
  ),
  action: (
    <ActionForm
      confirmation="Test confirmation only"
      action={async (data) => {
        await new Promise((r) => setTimeout(r, 150));
        if (window.failAction) throw new Error("secret-must-not-leak");
        window.calls.push({ name: "test", data: Object.fromEntries(data) });
      }}
    >
      <label>
        Test input
        <input name="field" required />
      </label>
      <button className="admin-btn">Save test</button>
    </ActionForm>
  ),
};
createRoot(document.getElementById("root")!).render(
  <div className="admin-app" dir="ltr">
    <header className="admin-topbar">
      <div className="admin-brand">
        Tiger Store<small>Business workspace</small>
      </div>
      <button className="admin-btn">Sign out</button>
    </header>
    <div className="admin-layout">
      <AdminNavigation />
      <main className="admin-content">
        <div className="admin-page-heading">
          <p className="admin-overline">Tiger / Workspace</p>
          <h1>
            {view === "editor"
              ? "Edit product"
              : view[0].toUpperCase() + view.slice(1)}
          </h1>
          <p>Manage your store in one workspace.</p>
        </div>
        {views[view]}
      </main>
    </div>
  </div>,
);
