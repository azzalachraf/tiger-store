import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Boxes, CreditCard, ExternalLink, LayoutDashboard, LogOut, Settings, ShoppingBag } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

const adminNav = [{ href: "/admin", label: "Overview", icon: LayoutDashboard, group: "Store" }, { href: "/admin/products", label: "Products", icon: Boxes, group: "Store" }, { href: "/admin/orders", label: "Orders", icon: ShoppingBag, group: "Store" }, { href: "/admin/payment-methods", label: "Payment methods", icon: CreditCard, group: "Store" }, { href: "/admin/stock-alerts", label: "Stock alerts", icon: Boxes, group: "Store" }, { href: "/admin/settings", label: "Store settings", icon: Settings, group: "Store" }];

const groupedNav = adminNav.reduce<Record<string, typeof adminNav>>((groups, item) => {
  groups[item.group] = [...(groups[item.group] ?? []), item];
  return groups;
}, {});

type AdminShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export async function AdminShell({ title, description, children }: AdminShellProps) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="border-b border-white/10 bg-[#111]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3 font-extrabold">
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white">
              <Image src="/logo/tiger-store-ui.png" alt="Tiger Store" fill sizes="44px" className="object-cover object-left" />
            </span>
            <span>
              <span className="block text-sm text-white">Tiger Admin</span>
              <span className="block text-xs font-bold text-tiger-gold">digitaldz.shop</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="hidden rounded-full sm:inline-flex">
              <Link href="/" target="_blank">
                <ExternalLink className="h-4 w-4" />
                View Store
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm" className="rounded-full">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[270px_1fr] lg:px-8">
        <aside className="h-fit rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(32,32,32,0.96),rgba(16,16,16,0.98))] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.3)] lg:sticky lg:top-5">
          <nav className="scrollbar-none flex gap-2 overflow-x-auto lg:grid lg:overflow-visible" aria-label="Admin navigation">
            {Object.entries(groupedNav).map(([group, items]) => (
              <div key={group} className="contents lg:block">
                <p className="mb-1 mt-3 hidden px-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/35 first:mt-0 lg:block">{group}</p>
                <div className="flex gap-2 lg:grid lg:gap-1">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm font-bold text-white/72 transition-colors duration-150 hover:border-tiger-ember/35 hover:bg-tiger-ember/12 hover:text-white lg:border-transparent lg:bg-transparent"
                    >
                      <item.icon className="h-4 w-4 text-tiger-ember" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(255,106,0,0.12),rgba(24,24,24,0.96))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">Control Center</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl leading-7 text-white/62">{description}</p> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
