"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Asterisk } from "@/components/ui";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/beranda", label: "Beranda" },
  { href: "/kalender", label: "Kalender" },
  { href: "/grup", label: "Grup" },
  { href: "/profil", label: "Profil" },
];

function isActive(path: string, href: string): boolean {
  if (href === "/grup") return path === "/grup" || path.startsWith("/grup/");
  if (href === "/beranda") return path === "/beranda" || path.startsWith("/event/");
  if (href === "/kalender") return path === "/kalender";
  return path === href;
}

function useViewNav() {
  const router = useRouter();
  return useCallback(
    (e: React.MouseEvent, href: string) => {
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => void;
      };
      if (doc.startViewTransition) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduce && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          doc.startViewTransition(() => {
            router.push(href);
          });
        }
      }
    },
    [router]
  );
}

function CountBadge({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-bump");
    void el.offsetWidth;
    el.classList.add("is-bump");
  }, [value]);
  if (!value) return null;
  return (
    <span ref={ref} className="x-count">
      {value}
    </span>
  );
}

export function TabBar() {
  const path = usePathname();
  const { openNew } = useStore();
  const go = useViewNav();
  const item = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={isActive(path, href) ? "is-on" : ""}
      aria-current={isActive(path, href) ? "page" : undefined}
      onClick={(e) => go(e, href)}
    >
      {label}
    </Link>
  );
  return (
    <nav className="r-tabbar" aria-label="Navigasi utama">
      {item("/beranda", "Beranda")}
      {item("/kalender", "Kalender")}
      <button type="button" className="x-plus" aria-label="Baru" onClick={() => openNew()} style={{ border: 0 }}>
        +
      </button>
      {item("/grup", "Grup")}
      {item("/profil", "Profil")}
    </nav>
  );
}

const SIDE_LINKS = [
  { href: "/beranda", label: "Beranda" },
  { href: "/kalender", label: "Kalender" },
  { href: "/grup", label: "Grup" },
  { href: "/persetujuan", label: "Persetujuan" },
  { href: "/notifikasi", label: "Notifikasi" },
];

export function Sidebar() {
  const path = usePathname();
  const { approvals, user, userName, openNew, unreadCount } = useStore();
  const go = useViewNav();
  const pending = approvals.filter((a) => a.decision === null).length;
  const email = user?.email ?? "";
  const initials = userName.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "RU";
  const activeIdx = Math.max(
    0,
    SIDE_LINKS.findIndex((l) => isActive(path, l.href))
  );

  return (
    <aside className="x-side">
      <Asterisk className="x-ast x-deco" />
      <Link className="x-logo" href="/beranda" onClick={(e) => go(e, "/beranda")}>
        <Asterisk />
        RUTINA
      </Link>
      <button type="button" className="x-newbtn" onClick={() => openNew()}>
        + Baru
      </button>
      <nav aria-label="Navigasi utama" className="x-side-nav">
        <span
          className="x-side-pill"
          aria-hidden="true"
          style={{ transform: `translateY(calc(${activeIdx} * 46px))` }}
        />
        {SIDE_LINKS.map((l) => {
          const on = isActive(path, l.href);
          const badge = l.href === "/persetujuan" ? pending : l.href === "/notifikasi" ? unreadCount : 0;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={on ? "is-on" : ""}
              aria-current={on ? "page" : undefined}
              onClick={(e) => go(e, l.href)}
            >
              {l.label}
              <CountBadge value={badge} />
            </Link>
          );
        })}
      </nav>
      <Link className="x-user" href="/profil" title="Profil & pengaturan" onClick={(e) => go(e, "/profil")}>
        <span aria-hidden="true">{initials}</span>
        <span className="x-user-meta">
          <b>{userName}</b>
          {email ? <small>{email}</small> : null}
        </span>
      </Link>
    </aside>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-mobile">
      {children}
      <TabBar />
    </div>
  );
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-desktop">
      <div className="r-desk">
        <Sidebar />
        <div className="r-dmain">{children}</div>
      </div>
    </div>
  );
}

export { NAV };
