import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminNavigation } from "./AdminNavigation";
import "./admin.css";

export async function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-app" dir="ltr">
      <a href="#admin-content" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand">
          <Image
            src="/logo/tiger-store-ui.png"
            alt="Tiger Store"
            width={40}
            height={40}
            className="rounded-xl bg-white object-contain"
          />
          <span>
            Tiger Store<small>Business workspace</small>
          </span>
        </Link>
        <div className="admin-top-actions">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="admin-btn admin-desktop-only"
          >
            <ExternalLink size={15} />
            View store
          </Link>
          <form action={logoutAction}>
            <button className="admin-btn" aria-label="Sign out">
              <LogOut size={17} />
              <span className="admin-desktop-only">Sign out</span>
            </button>
          </form>
        </div>
      </header>
      <div className="admin-layout">
        <AdminNavigation />
        <main id="admin-content" className="admin-content">
          <div className="admin-page-heading">
            <div className="admin-overline">Tiger / Workspace</div>
            <h1 dir="auto">{title}</h1>
            {description && <p dir="auto">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
