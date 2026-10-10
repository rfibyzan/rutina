"use client";

import Link from "next/link";
import {
  EventItem,
  PRIORITY_LABEL,
  Priority,
  ROLE_LABEL,
  Role,
} from "@/lib/data";

export function Asterisk({ className = "x-ast" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 100 100">
      <g transform="translate(50 50)">
        <rect x="-8" y="-48" width="16" height="96" rx="1.5" />
        <rect x="-8" y="-48" width="16" height="96" rx="1.5" transform="rotate(45)" />
        <rect x="-8" y="-48" width="16" height="96" rx="1.5" transform="rotate(90)" />
        <rect x="-8" y="-48" width="16" height="96" rx="1.5" transform="rotate(135)" />
      </g>
    </svg>
  );
}

export function PriorityChip({ value, short = false }: { value: Priority; short?: boolean }) {
  const label = short ? `P${value}` : PRIORITY_LABEL[value];
  return <span className={`x-chip x-chip--p${value}`}>{label}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "owner"
      ? "x-badge--pemilik"
      : role === "admin"
        ? "x-badge--admin"
        : role === "editor"
          ? "x-badge--editor"
          : role === "contributor"
            ? "x-badge--kontributor"
            : "x-badge--pengikut";
  return <span className={`x-badge ${cls}`}>{ROLE_LABEL[role]}</span>;
}

export function StatusChip({ status }: { status: EventItem["status"] }) {
  return status === "approved" ? (
    <span className="x-chip x-chip--ok">Disetujui</span>
  ) : (
    <span className="x-chip x-chip--wait">Menunggu</span>
  );
}

export function EventRow({ event }: { event: EventItem }) {
  const colorVar = `var(--p${event.priority})`;
  return (
    <Link className="x-event" style={{ ["--c" as string]: colorVar }} href={`/event/${event.id}`}>
      <time>{event.start}</time>
      <div>
        <h4>{event.title}</h4>
        <div className="x-meta">
          <span className="x-tag">{event.group}</span>
          <PriorityChip value={event.priority} />
        </div>
      </div>
    </Link>
  );
}

export function Pick<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} style={{ display: "contents" }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`x-chip${o === value ? " is-on" : ""}`}
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="x-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  render?: (o: T) => React.ReactNode;
}) {
  return (
    <div className="x-tabs" role="group" aria-label={label} data-pick>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          className={o === value ? "is-on" : ""}
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

export function PrioritySegment({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (v: Priority) => void;
}) {
  const colors: Record<Priority, string> = {
    1: "var(--p1)",
    2: "var(--p2)",
    3: "var(--p3)",
    4: "var(--p4)",
  };
  const onColor: Record<Priority, string> = { 1: "#fff", 2: "var(--ink)", 3: "#fff", 4: "var(--ink)" };
  return (
    <div className="x-seg" role="group" aria-label="Prioritas" data-pick>
      {([1, 2, 3, 4] as Priority[]).map((p) => (
        <button
          key={p}
          type="button"
          style={{ ["--c" as string]: colors[p], ["--on" as string]: onColor[p] }}
          className={p === value ? "is-on" : ""}
          aria-pressed={p === value}
          onClick={() => onChange(p)}
        >
          P{p}
        </button>
      ))}
    </div>
  );
}

export function RsvpSegment({
  value,
  onChange,
}: {
  value: EventItem["rsvp"];
  onChange: (v: EventItem["rsvp"]) => void;
}) {
  return (
    <div className="x-rsvp" role="group" aria-label="Kehadiran" data-pick>
      {(["Hadir", "Mungkin", "Tidak"] as const).map((r) => (
        <button
          key={r}
          type="button"
          className={r === value ? "is-on" : ""}
          aria-pressed={r === value}
          onClick={() => onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="x-skel" role="status" aria-label="Memuat">
      <i />
      <i />
      <i />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="x-empty" role="status">
      {text}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="x-err" role="alert">
      {text}
      <div style={{ marginTop: 10 }}>
        <button type="button" className="x-btn x-btn--sm x-btn--outline" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    </div>
  );
}
