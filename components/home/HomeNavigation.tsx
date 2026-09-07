"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Moon, Sun, ShoppingBag } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import { useTheme } from "@/lib/useTheme";
import { readCart } from "@/lib/cart";
import type { Locale } from "@/lib/types";
import { homeCopy } from "./copy";
import styles from "./home.module.css";

export function HomeNavigation() {
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const c = homeCopy[locale];
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () =>
      setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    update();
    window.addEventListener("tiger-store-cart-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tiger-store-cart-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const links = [
    ["#subscriptions", c.shop],
    ["#how-it-works", c.how],
    ["/contact", c.support],
  ];
  return (
    <header className={styles.header}>
      <a className={styles.skip} href="#home-main">
        {c.skip}
      </a>
      <div className={`${styles.container} ${styles.headerRow}`}>
        <Link href="/" className={styles.logo} aria-label="Tiger Store">
          <Image
            src="/logo/tiger-store-ui.png"
            alt="Tiger Store"
            width={42}
            height={42}
            priority
          />
          <span aria-hidden="true">Tiger Store</span>
        </Link>
        <nav className={styles.desktopNav} aria-label={c.menu}>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerControls}>
          <label className={styles.srOnly} htmlFor="home-language">
            {c.language}
          </label>
          <select
            id="home-language"
            aria-label={c.language}
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="ar">العربية</option>
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            aria-label={theme === "dark" ? c.light : c.dark}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link href="/cart" aria-label={c.cart} className={styles.cart}>
            {count > 0 && <span>{count}</span>}
            <ShoppingBag size={20} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={c.menu}
            aria-expanded={open}
            aria-controls="home-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="home-mobile-menu"
          className={styles.mobileNav}
          aria-label={c.menu}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
