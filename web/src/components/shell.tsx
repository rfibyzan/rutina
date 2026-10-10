"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  if (href === "/kalender") return path === "/kalender" || path === "/tambah";
  return path === href;
}

export function TabBar() {
  const path = usePathname();
  const { openNew } = useStore();
  return (
    <nav className="r-tabbar" aria-label="Navigasi utama">
      <Link href="/beranda" className={isActive(path, "/beranda") ? "is-on" : ""} aria-current={isActive(path, "/beranda") ? "page" : undefined}>
        Beranda
      </Link>
      <Link href="/kalender" className={isActive(path, "/kalender") ? "is-on" : ""} aria-current={isActive(path, "/kalender") ? "page" : undefined}>
        Kalender
      </Link>
      <button type="button" className="x-plus" aria-label="Baru" onClick={() => openNew()} style={{ border: 0 }}>
        +
      </button>
      <Link href="/grup" className={isActive(path, "/grup") ? "is-on" : ""} aria-current={isActive(path, "/grup") ? "page" : undefined}>
        Grup
      </Link>
      <Link href="/profil" className={isActive(path, "/profil") ? "is-on" : ""} aria-current={isActive(path, "/profil") ? "page" : undefined}>
        Profil
      </Link>
    </nav>
  );
}

export function Sidebar() {
  const path = usePathname();
  const { approvals, userName, myGroups, hiddenGroups, toggleHiddenGroup, openNew, unreadCount } = useStore();
  const pending = approvals.filter((a) => a.decision === null).length;
  const link = (href: string, label: string, badge?: number) => (
    <Link key={href} href={href} className={isActive(path, href) ? "is-on" : ""} aria-current={isActive(path, href) ? "page" : undefined}>
      {label}
      {badge ? <span className="x-count">{badge}</span> : null}
    </Link>
  );
  return (
    <aside className="x-side">
      <Asterisk className="x-ast x-deco" />
      <Link className="x-logo" href="/beranda">
        <Asterisk />
        RUTINA
      </Link>
      <button type="button" className="x-newbtn" onClick={() => openNew()}>
        + Baru
      </button>
      <nav aria-label="Navigasi utama">
        {link("/beranda", "Beranda")}
        {link("/kalender", "Kalender")}
        {link("/grup", "Grup")}
        {link("/persetujuan", "Persetujuan", pending)}
        {link("/notifikasi", "Notifikasi", unreadCount)}
        {link("/profil", "Pengaturan")}
      </nav>
      <h5>Grup Saya</h5>
      <ul>
        {myGroups.length === 0 && <li>Tidak ada grup</li>}
        {myGroups.map((g) => (
          <li key={g.id}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!hiddenGroups.includes(g.name)}
                onChange={() => toggleHiddenGroup(g.name)}
                aria-label={`Tampilkan ${g.name} di kalender`}
                style={{ width: 18, height: 18, accentColor: "#fff" }}
              />
              <i style={{ ["--c" as string]: g.color }} /> {g.name}
            </label>
          </li>
        ))}
      </ul>
      <Link className="x-user" href="/profil">
        <span>{userName.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>{userName}
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
