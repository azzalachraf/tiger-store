import Link from "next/link";
import { ReactNode } from "react";
import { BarChart3, Boxes, CreditCard, ImageIcon, LayoutDashboard, LogOut, PackagePlus, Settings, ShoppingBag } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

const adminNav = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/products", label: "المنتجات", icon: Boxes },
  { href: "/admin/products/new", label: "منتج جديد", icon: PackagePlus },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/payment-methods", label: "طرق الدفع", icon: CreditCard },
  { href: "/admin/banners", label: "البنرات", icon: ImageIcon },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

type AdminShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export async function AdminShell({ title, description, children }: AdminShellProps) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:px-5 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2 font-extrabold">
            <BarChart3 className="h-6 w-6 text-tiger-ember" />
            Tiger Admin
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.045] p-2">
          <nav className="grid gap-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/72 hover:bg-tiger-ember/15 hover:text-white"
              >
                <item.icon className="h-4 w-4 text-tiger-ember" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section>
          <div className="mb-5">
            <p className="font-bold text-tiger-gold">لوحة التحكم</p>
            <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
            {description ? <p className="mt-2 leading-7 text-white/58">{description}</p> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
