"use client";

import Link from "next/link";
import { Asterisk, PriorityChip, RoleBadge, StatusChip } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useToast } from "@/lib/store";

const SWATCHES = [
  ["primary", "#073693"],
  ["primary-deep", "#062F80"],
  ["primary-50", "#E8EEFA"],
  ["surface", "#FFFFFF"],
  ["muted", "#EBE9E9"],
  ["ink", "#0B0B0F"],
  ["ink-2", "#4A4F5C"],
  ["success", "#1F9D55"],
  ["pending", "#F2B705"],
  ["p1", "#E5322D"],
  ["p2", "#F28C28"],
  ["p3", "#073693"],
  ["p4", "#9AA3B2"],
] as const;

export default function KatalogPage() {
  const { say } = useToast();
  const body = (
    <div className="x-tokens" style={{ borderTop: 0 }}>
      <h2>Design Tokens</h2>
      <div className="x-tokrow">
        <h3>Warna</h3>
        {SWATCHES.map(([n, c]) => (
          <div key={n} className="x-swatch">
            <i style={{ ["--c" as string]: c }} />
            <b>{n}</b>
            <span>{c}</span>
          </div>
        ))}
      </div>
      <div className="x-tokrow">
        <h3>Tipografi · PP Neue Machina</h3>
        <div className="x-type">
          <span className="t1">Display 36 / 700</span>
          <span className="t2">Judul 20 / 700, -0.02em</span>
          <span className="t3">Teks isi 15 / 400 — Jadwal pribadi dan bersama.</span>
          <span className="t4">Keterangan 12 / 500</span>
        </div>
      </div>
      <div className="x-tokrow">
        <h3>Tombol</h3>
        <button type="button" className="x-btn" style={{ width: "auto" }} onClick={() => say("Contoh tombol Utama")}>
          Utama
        </button>
        <button type="button" className="x-btn x-btn--outline" style={{ width: "auto" }} onClick={() => say("Contoh tombol Outline")}>
          Outline
        </button>
        <button type="button" className="x-btn x-btn--ghost" style={{ width: "auto" }} onClick={() => say("Contoh tombol Ghost")}>
          Ghost
        </button>
      </div>
      <div className="x-tokrow">
        <h3>Prioritas</h3>
        <PriorityChip value={1} />
        <PriorityChip value={2} />
        <PriorityChip value={3} />
        <PriorityChip value={4} />
        <StatusChip status="approved" />
        <span className="x-chip x-chip--wait">Menunggu</span>
      </div>
      <div className="x-tokrow">
        <h3>Role</h3>
        <RoleBadge role="owner" />
        <RoleBadge role="admin" />
        <RoleBadge role="editor" />
        <RoleBadge role="contributor" />
        <RoleBadge role="viewer" />
      </div>
      <div className="x-tokrow">
        <h3>Motif</h3>
        <Asterisk className="x-ast" />
        <span className="x-sub">Asterisk 8 lengan, dekorasi terpotong tepi di header dan onboarding.</span>
      </div>
      <p className="x-sub">
        <Link href="/beranda">‹ Kembali ke Beranda</Link>
      </p>
    </div>
  );

  return (
    <>
      <MobileShell>{body}</MobileShell>
      <DesktopShell>
        <div className="r-dcenter" style={{ maxWidth: 860 }}>{body}</div>
      </DesktopShell>
    </>
  );
}
