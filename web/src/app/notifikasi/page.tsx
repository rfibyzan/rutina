"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, LoadingSkeleton } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  day: string;
  read: boolean;
  eventId: string | null;
}

export default function NotifikasiPage() {
  const { user, markNotifsRead } = useStore();
  const { say } = useToast();
  const [supabase] = useState(() => createClient());
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setNotices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,type,payload,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setNotices(
        (data as { id: string; type: string; payload: Record<string, string>; read_at: string | null }[]).map((n) => ({
          id: n.id,
          title: n.payload?.title ?? n.type,
          body: n.payload?.body ?? "",
          day: n.payload?.day ?? "",
          read: !!n.read_at,
          eventId: n.payload?.eventId ?? null,
        }))
      );
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openOne = async (n: NoticeRow) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
  };

  const allRead = async () => {
    await markNotifsRead();
    setNotices((prev) => prev.map((x) => ({ ...x, read: true })));
    say("Semua notifikasi ditandai dibaca");
  };

  const unread = notices.filter((n) => !n.read).length;

  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 className="x-h">Notifikasi</h2>
          <p className="x-sub">{unread} belum dibaca</p>
        </div>
        {unread > 0 && (
          <button type="button" className="x-btn x-btn--outline x-btn--sm" style={{ width: "auto" }} onClick={allRead}>
            Tandai dibaca
          </button>
        )}
      </div>
      <div className="x-stack" style={{ marginTop: 16 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : notices.length === 0 ? (
          <EmptyState text="Belum ada notifikasi." />
        ) : (
          notices.map((n) => {
            const inner = (
              <>
                <h4 style={{ fontSize: 15, marginBottom: 4 }}>
                  {!n.read && <span className="x-count" style={{ marginRight: 6 }}>Baru</span>}
                  {n.title}
                </h4>
                <p className="x-sub">{n.body}</p>
                <p className="x-sub" style={{ marginTop: 6 }}>{n.day}</p>
              </>
            );
            return n.eventId ? (
              <Link key={n.id} href={`/event/${n.eventId}`} className="x-card" style={{ opacity: n.read ? 0.75 : 1 }} onClick={() => openOne(n)}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className="x-card" style={{ opacity: n.read ? 0.75 : 1 }}>
                {inner}
              </div>
            );
          })
        )}
      </div>
      <p className="x-sub" style={{ marginTop: 16 }}>
        Butuh tindakan? <Link href="/persetujuan">Buka antrean persetujuan</Link>
      </p>
    </>
  );

  return (
    <>
      <MobileShell>
        <div className="r-screen">{body}</div>
      </MobileShell>
      <DesktopShell>
        <div className="r-dcenter">{body}</div>
      </DesktopShell>
    </>
  );
}
