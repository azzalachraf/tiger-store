"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Users,
  BarChart3,
  Settings,
  WalletCards,
  TicketCheck,
  ClipboardCopy,
  CreditCard,
  Bell,
  KeyRound,
  Target,
  Menu,
  X,
} from "lucide-react";
const groups = [
  {
    label: "Workspace",
    items: [
      ["/admin", "Overview", LayoutDashboard],
      ["/admin/orders", "Orders", ShoppingBag],
      ["/admin/products", "Products", Boxes],
      ["/admin/card-stock", "Card stock", TicketCheck],
      ["/admin/accounts", "Accounts", KeyRound],
    ],
  },
  {
    label: "Insights & people",
    items: [
      ["/admin/statistics", "Statistics", BarChart3],
      ["/admin/marketing/funnel", "Traffic", Target],
      ["/admin/customers", "Customers", Users],
      ["/admin/team", "Team", Users],
      ["/admin/tiger-new-sheet", "Tiger New Sheet", ClipboardCopy],
      ["/admin/finance", "Finance", WalletCards],
    ],
  },
  {
    label: "Configuration",
    items: [
      ["/admin/payment-methods", "Payment methods", CreditCard],
      ["/admin/stock-alerts", "Stock alerts", Bell],
      ["/admin/marketing/attribution", "Attribution", Target],
      ["/admin/marketing/meta", "Meta integration", Target],
      ["/admin/banners", "Banners", Boxes],
      ["/admin/settings", "Settings", Settings],
    ],
  },
] as const;
export function AdminNavigation() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) menu.current?.showModal();
    else menu.current?.close();
  }, [open]);
  const active = (href: string) =>
    path === href || (href !== "/admin" && path.startsWith(href + "/"));
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", close);
    };
  }, [open]);
  const navigation = (
    <nav aria-label="Admin navigation">
      {groups.map((group) => (
        <div key={group.label} className="admin-nav-group">
          <p>{group.label}</p>
          {group.items.map(([href, label, Icon]) => (
            <Link
              prefetch={false}
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="admin-nav-link"
              aria-current={active(href) ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <aside className="admin-sidebar">{navigation}</aside>
      <nav className="admin-mobile-nav" aria-label="Quick navigation">
        {groups[0].items.slice(0, 4).map(([href, label, Icon]) => (
          <Link
            prefetch={false}
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon size={21} />
            {label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={21} />
          More
        </button>
      </nav>
      <dialog
        ref={menu}
        id="admin-menu"
        className="admin-menu"
        onCancel={() => setOpen(false)}
        aria-label="Workspace navigation"
      >
        <div className="admin-menu-head">
          <strong>Workspace navigation</strong>
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="admin-btn"
          >
            <X size={20} />
          </button>
        </div>
        {navigation}
      </dialog>
    </>
  );
}
