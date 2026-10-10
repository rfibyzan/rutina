"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  Approval,
  Decision,
  EventItem,
  MyGroup,
  NewEventInput,
  NewPrefill,
  TaskItem,
} from "@/lib/data";

interface Store {
  ready: boolean;
  authReady: boolean;
  user: User | null;
  userName: string;
  loadError: string | null;
  events: EventItem[];
  tasks: TaskItem[];
  myGroups: MyGroup[];
  approvals: Approval[];
  unreadCount: number;
  newOpen: boolean;
  newPrefill: NewPrefill;
  openNew: (p?: NewPrefill) => void;
  closeNew: () => void;
  reload: () => void;
  setRsvp: (id: string, rsvp: EventItem["rsvp"]) => void;
  markAttendance: (id: string, value: "done" | "absent") => void;
  toggleCheck: (id: string, index: number) => void;
  addChecklist: (id: string, label: string) => void;
  decide: (id: string, decision: Exclude<Decision, null>, note?: string) => void;
  removeApproval: (id: string) => void;
  addEvent: (e: NewEventInput) => Promise<{ ok: boolean; id?: string }>;
  checkConflict: (startAt: string, endAt: string) => EventItem[];
  updateEvent: (id: string, patch: { title: string; note: string; location: string; priority: EventItem["priority"]; startAt: string; endAt: string }) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  duplicateEvent: (id: string) => Promise<void>;
  addTask: (t: { title: string; groupId: string | null; dueAt: string | null; priority: TaskItem["priority"]; note: string }) => Promise<boolean>;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: { title?: string; note?: string; priority?: TaskItem["priority"]; dueAt?: string | null; groupId?: string | null }) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  markNotifsRead: () => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

const DOW_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MON_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDateLabel(d: Date): string {
  const dow = DOW_ID[d.getDay()];
  return `${dow} ${d.getDate()} ${MON_ID[d.getMonth()]}`;
}

function fmtDay(d: Date): string {
  const full = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d.getDay()];
  return `${full}, ${d.getDate()} ${MON_ID[d.getMonth()]}`;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(row: any, userId: string | null): EventItem {
  const start = row.start_at ? new Date(row.start_at) : new Date();
  const end = row.end_at ? new Date(row.end_at) : new Date(start.getTime() + 3600000);
  const groupName: string = row.groups?.name ?? "Pribadi";
  const groupColor: string = row.groups?.color ?? "#073693";
  const subs: { id: string; title: string; done: boolean }[] = Array.isArray(row.subtasks)
    ? row.subtasks.map((s: { id: string; title: string; done: boolean }) => ({
        id: s.id,
        title: s.title,
        done: !!s.done,
      }))
    : [];
  const attendeesRows: { user_id: string; rsvp?: unknown; attendance?: unknown; users?: { name?: string } }[] = Array.isArray(
    row.event_attendees
  )
    ? row.event_attendees
    : [];
  const names = attendeesRows
    .map((a) => a.users?.name ?? "")
    .filter((n) => n.length > 0);
  const mine = attendeesRows.find((a) => a.user_id === userId) ?? attendeesRows[0];
  const status: EventItem["status"] =
    row.status === "pending" ? "pending" : "approved";
  const myAtt = mine;
  const rsvpRaw: string = typeof myAtt === "object" && myAtt !== null
    ? String((myAtt as { rsvp?: unknown }).rsvp ?? "Mungkin")
    : "Mungkin";
  const rsvp: EventItem["rsvp"] =
    rsvpRaw === "Hadir" || rsvpRaw === "Tidak" ? rsvpRaw : "Mungkin";
  const attRaw = typeof myAtt === "object" && myAtt !== null
    ? (myAtt as { attendance?: unknown }).attendance
    : null;
  const attendance: EventItem["attendance"] =
    attRaw === "done" || attRaw === "absent" ? attRaw : null;
  return {
    id: String(row.id),
    title: String(row.title ?? "(Tanpa judul)"),
    group: groupName,
    groupColor,
    groupId: row.group_id ? String(row.group_id) : null,
    day: fmtDay(start),
    dateLabel: fmtDateLabel(start),
    start: fmtTime(start),
    end: fmtTime(end),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    priority: [1, 2, 3, 4].includes(row.priority) ? row.priority : 3,
    status,
    rsvp,
    attendance,
    attendees: names.length > 0 ? names.map(initials) : ["RB"],
    extraAttendees: Math.max(0, names.length > 0 ? names.length - names.slice(0, 3).length : 0),
    checklist: subs.map((s) => ({ label: s.title, done: s.done })),
    note: String(row.description ?? ""),
    location: String(row.location ?? ""),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): TaskItem {
  const due = row.due_at ? new Date(row.due_at) : null;
  return {
    id: String(row.id),
    title: String(row.title ?? "(Tanpa judul)"),
    group: row.groups?.name ?? "Pribadi",
    groupColor: row.groups?.color ?? "#073693",
    groupId: row.group_id ? String(row.group_id) : null,
    dueLabel: due ? `${fmtDateLabel(due)} · ${fmtTime(due)}` : "Tanpa tenggat",
    dueAt: due ? due.toISOString() : null,
    priority: [1, 2, 3, 4].includes(row.priority) ? row.priority : 3,
    done: !!row.done,
    note: String(row.description ?? ""),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToApproval(row: any, userId: string | null): Approval {
  const start = row.start_at ? new Date(row.start_at) : new Date();
  const end = row.end_at ? new Date(row.end_at) : new Date();
  return {
    id: String(row.id),
    title: String(row.title ?? "(Tanpa judul)"),
    requester: row.creator?.name ?? "Anggota",
    group: row.groups?.name ?? "",
    eventId: String(row.id),
    byMe: !!userId && row.created_by === userId,
    when: `${fmtDateLabel(start)}, ${fmtTime(start)}-${fmtTime(end)}`,
    conflict: null,
    decision:
      row.status === "pending"
        ? null
        : row.status === "approved"
          ? "approved"
          : row.status === "rejected"
            ? "rejected"
            : "needs_revision",
  };
}

function displayFallback(u: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const m = u.user_metadata ?? {};
  return (
    (m.full_name as string | undefined) ||
    (m.name as string | undefined) ||
    (u.email?.split("@")[0] as string | undefined) ||
    "Pengguna"
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [ready, setReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("Pengguna");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<NewPrefill>({});
  const [subIds, setSubIds] = useState<Record<string, string[]>>({});

  const openNew = useCallback((p?: NewPrefill) => {
    setNewPrefill(p ?? {});
    setNewOpen(true);
  }, []);
  const closeNew = useCallback(() => setNewOpen(false), []);

  const load = useCallback(async () => {
    setReady(false);
    setLoadError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const u = session.session?.user ?? null;
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setEvents([]);
        setTasks([]);
        setMyGroups([]);
        setApprovals([]);
        setUnreadCount(0);
        setReady(true);
        return;
      }
      const { data: me } = await supabase.from("users").select("name").eq("id", u.id).maybeSingle();
      const dbName = (me as { name?: string } | null)?.name?.trim();
      setUserName(
        dbName ||
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined) ||
        (u.email?.split("@")[0] as string | undefined) ||
        "Pengguna"
      );
      if (!dbName) {
        await supabase
          .from("users")
          .upsert({ id: u.id, name: displayFallback(u), email: u.email ?? "" }, { onConflict: "id" });
      }

      const FULL_SELECT =
        "id,title,description,location,start_at,end_at,priority,status,group_id,groups(name,color),subtasks(id,title,done),event_attendees(rsvp,attendance,user_id,users(name)),created_by,creator:users!events_created_by_fkey(name)";
      const SIMPLE_SELECT =
        "id,title,description,location,start_at,end_at,priority,status,group_id,groups(name,color),subtasks(id,title,done),event_attendees(rsvp,attendance,user_id)";
      const first = await supabase
        .from("events")
        .select(FULL_SELECT)
        .order("start_at", { ascending: true })
        .limit(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any[] | null = first.data as any[] | null;
      let error = first.error;
      if (error) {
        const retry = await supabase
          .from("events")
          .select(SIMPLE_SELECT)
          .order("start_at", { ascending: true })
          .limit(200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data = retry.data as any[] | null;
        error = retry.error;
      }
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      const mapped = rows.map((r) => rowToEvent(r, u.id));
      const idMap: Record<string, string[]> = {};
      rows.forEach((r) => {
        const rec = r as { id: string; subtasks?: { id: string }[] };
        idMap[String(rec.id)] = (rec.subtasks ?? []).map((s) => s.id);
      });
      setSubIds(idMap);
      setEvents(mapped);
      setApprovals(rows.map((r) => rowToApproval(r, u.id)));

      const { data: tdata } = await supabase
        .from("tasks")
        .select("id,title,description,due_at,done,priority,group_id,groups(name,color)")
        .eq("owner_user_id", u.id)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasks(((tdata ?? []) as any[]).map(rowToTask));

      const { data: mem } = await supabase
        .from("group_members")
        .select("role,group_id,groups(id,name,color)")
        .eq("user_id", u.id);
      const seen = new Map<string, MyGroup>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of ((mem ?? []) as any[])) {
        const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
        if (g) {
          seen.set(g.id, { id: g.id, name: g.name, color: g.color, role: r.role as MyGroup["role"] });
        }
      }
      const { data: owned } = await supabase.from("groups").select("id,name,color").eq("owner_id", u.id);
      for (const g of ((owned ?? []) as { id: string; name: string; color: string }[])) {
        if (!seen.has(g.id)) seen.set(g.id, { id: g.id, name: g.name, color: g.color, role: "owner" });
      }
      setMyGroups(Array.from(seen.values()));

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.id)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
      setReady(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat dari Supabase.");
      setReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load, supabase]);

  const setRsvp = useCallback(
    (id: string, rsvp: EventItem["rsvp"]) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, rsvp } : e)));
      if (!user) return;
      supabase
        .from("event_attendees")
        .upsert({ event_id: id, user_id: user.id, rsvp }, { onConflict: "event_id,user_id" })
        .then(({ error }) => {
          if (error) setLoadError(`RSVP tidak tersimpan: ${error.message}`);
        });
    },
    [supabase, user]
  );

  const markAttendance = useCallback(
    (id: string, value: "done" | "absent") => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, attendance: value } : e)));
      if (!user) return;
      supabase
        .from("event_attendees")
        .upsert({ event_id: id, user_id: user.id, attendance: value }, { onConflict: "event_id,user_id" })
        .then(({ error }) => {
          if (error) setLoadError(`Kehadiran tidak tersimpan: ${error.message}`);
        });
    },
    [supabase, user]
  );

  const toggleCheck = useCallback(
    (id: string, index: number) => {
      const ids = subIds[id] ?? [];
      const subId = ids[index];
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, checklist: e.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)) }
            : e
        )
      );
      const target = events.find((e) => e.id === id)?.checklist[index];
      if (!subId || !target) return;
      supabase
        .from("subtasks")
        .update({ done: !target.done })
        .eq("id", subId)
        .then(({ error }) => {
          if (error) setLoadError(`Checklist tidak tersimpan: ${error.message}`);
        });
    },
    [events, subIds, supabase]
  );

  const addChecklist = useCallback(
    async (id: string, label: string) => {
      if (!user || label.trim().length === 0) return;
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ event_id: id, title: label.trim(), done: false })
        .select("id")
        .single();
      if (error) {
        setLoadError(`Checklist tidak tersimpan: ${error.message}`);
        return;
      }
      const sid = (data as { id: string }).id;
      setSubIds((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), sid] }));
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, checklist: [...e.checklist, { label: label.trim(), done: false }] } : e))
      );
    },
    [supabase, user]
  );

  const decide = useCallback(
    (id: string, decision: Exclude<Decision, null>, note?: string) => {
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, decision } : a)));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: decision === "approved" ? "approved" : "pending" } : e
        )
      );
      const status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "needs_revision";
      supabase
        .from("events")
        .update({ status })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            setLoadError(`Keputusan tidak tersimpan: ${error.message}`);
            return;
          }
          if (user) {
            supabase.from("event_approvals").upsert(
              { event_id: id, approver_id: user.id, decision, note: note ?? "", decided_at: new Date().toISOString() },
              { onConflict: "event_id,approver_id" }
            );
          }
          load();
        });
    },
    [load, supabase, user]
  );

  const removeApproval = useCallback(
    (id: string) => {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      supabase
        .from("events")
        .delete()
        .eq("id", id)
        .then(() => load());
    },
    [load, supabase]
  );

  const checkConflict = useCallback(
    (startAt: string, endAt: string) => {
      return events.filter((e) => e.startAt && e.endAt && e.startAt < endAt && startAt < e.endAt);
    },
    [events]
  );

  const addEvent = useCallback(
    async (input: NewEventInput): Promise<{ ok: boolean; id?: string }> => {
      if (!user) {
        setLoadError("Masuk dulu untuk menambah event.");
        return { ok: false };
      }
      setLoadError(null);
      const { data, error } = await supabase
        .from("events")
        .insert({
          owner_user_id: user.id,
          created_by: user.id,
          group_id: input.groupId,
          title: input.title,
          description: input.note ?? "",
          location: input.location ?? "",
          start_at: input.startAt,
          end_at: input.endAt,
          rrule: input.rrule,
          priority: input.priority,
          status: input.status,
        })
        .select("id")
        .single();
      if (error) {
        setLoadError(`Gagal menyimpan: ${error.message}`);
        return { ok: false };
      }
      const newId = (data as { id: string }).id;
      await supabase.from("event_attendees").upsert(
        { event_id: newId, user_id: user.id, rsvp: "Hadir" },
        { onConflict: "event_id,user_id" }
      );
      if (input.reminderMinutes !== null) {
        await supabase.from("reminders").upsert(
          { event_id: newId, user_id: user.id, offset_minutes: input.reminderMinutes },
          { onConflict: "event_id,user_id,offset_minutes" }
        );
      }
      if (input.attendeeEmails.length > 0) {
        const { data: users } = await supabase.from("users").select("id").in("email", input.attendeeEmails);
        const rows = ((users ?? []) as { id: string }[])
          .filter((u) => u.id !== user.id)
          .map((u) => ({ event_id: newId, user_id: u.id, rsvp: "Mungkin" }));
        if (rows.length > 0) await supabase.from("event_attendees").upsert(rows, { onConflict: "event_id,user_id" });
      }
      await load();
      return { ok: true, id: newId };
    },
    [load, supabase, user]
  );

  const updateEvent = useCallback(
    async (id: string, patch: { title: string; note: string; location: string; priority: EventItem["priority"]; startAt: string; endAt: string }): Promise<boolean> => {
      const { error } = await supabase
        .from("events")
        .update({ title: patch.title, description: patch.note, location: patch.location, priority: patch.priority, start_at: patch.startAt, end_at: patch.endAt, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        setLoadError(`Gagal mengubah: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load, supabase]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) {
        setLoadError(`Gagal menghapus: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load, supabase]
  );

  const duplicateEvent = useCallback(
    async (id: string) => {
      const src = events.find((e) => e.id === id);
      if (!src || !src.startAt || !src.endAt || !user) return;
      const { data: g } = await supabase.from("groups").select("id").eq("name", src.group).limit(1).maybeSingle();
      const { data, error } = await supabase
        .from("events")
        .insert({
          owner_user_id: user.id,
          created_by: user.id,
          group_id: g ? (g as { id: string }).id : null,
          title: `${src.title} (salinan)`,
          description: src.note,
          location: src.location ?? "",
          start_at: src.startAt,
          end_at: src.endAt,
          priority: src.priority,
          status: "approved",
        })
        .select("id")
        .single();
      if (!error && data) {
        await supabase.from("event_attendees").upsert(
          { event_id: (data as { id: string }).id, user_id: user.id, rsvp: "Hadir" },
          { onConflict: "event_id,user_id" }
        );
        await load();
      }
    },
    [events, load, supabase, user]
  );

  const addTask = useCallback(
    async (t: { title: string; groupId: string | null; dueAt: string | null; priority: TaskItem["priority"]; note: string }): Promise<boolean> => {
      if (!user) {
        setLoadError("Masuk dulu untuk menambah tugas.");
        return false;
      }
      setLoadError(null);
      const { error } = await supabase.from("tasks").insert({
        owner_user_id: user.id,
        created_by: user.id,
        group_id: t.groupId,
        title: t.title,
        description: t.note ?? "",
        due_at: t.dueAt,
        priority: t.priority,
        done: false,
      });
      if (error) {
        setLoadError(`Gagal menyimpan tugas: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load, supabase, user]
  );

  const toggleTask = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      supabase
        .from("tasks")
        .update({ done: !target.done })
        .eq("id", id)
        .then(({ error }) => {
          if (error) setLoadError(`Tugas tidak tersimpan: ${error.message}`);
        });
    },
    [supabase, tasks]
  );

  const updateTask = useCallback(
    async (
      id: string,
      patch: { title?: string; note?: string; priority?: TaskItem["priority"]; dueAt?: string | null; groupId?: string | null }
    ): Promise<boolean> => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.note !== undefined) update.description = patch.note;
      if (patch.priority !== undefined) update.priority = patch.priority;
      if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
      if (patch.groupId !== undefined) update.group_id = patch.groupId;
      if (Object.keys(update).length === 0) return true;
      const { error } = await supabase.from("tasks").update(update).eq("id", id);
      if (error) {
        setLoadError(`Gagal mengubah tugas: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load, supabase]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        setLoadError(`Gagal menghapus tugas: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load, supabase]
  );

  const markNotifsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    setUnreadCount(0);
  }, [supabase, user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEvents([]);
    setTasks([]);
    setMyGroups([]);
    setApprovals([]);
    setUnreadCount(0);
  }, [supabase]);

  const resetDemo = useCallback(() => {
    load();
  }, [load]);

  const value = useMemo(
    () => ({ ready, authReady, user, userName, loadError, events, tasks, myGroups, approvals, unreadCount, newOpen, newPrefill, openNew, closeNew, reload: load, setRsvp, markAttendance, toggleCheck, addChecklist, decide, removeApproval, addEvent, checkConflict, updateEvent, deleteEvent, duplicateEvent, addTask, toggleTask, updateTask, deleteTask, markNotifsRead, signOut, resetDemo }),
    [ready, authReady, user, userName, loadError, events, tasks, myGroups, approvals, unreadCount, newOpen, newPrefill, openNew, closeNew, load, setRsvp, markAttendance, toggleCheck, addChecklist, decide, removeApproval, addEvent, checkConflict, updateEvent, deleteEvent, duplicateEvent, addTask, toggleTask, updateTask, deleteTask, markNotifsRead, signOut, resetDemo]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam StoreProvider.");
  return ctx;
}

interface ToastApi {
  say: (msg: string) => void;
}

const ToastContext = createContext<ToastApi>({ say: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [on, setOn] = useState(false);

  const say = useCallback((m: string) => {
    setMsg(m);
    setOn(true);
    window.setTimeout(() => setOn(false), 1800);
  }, []);

  const api = useMemo(() => ({ say }), [say]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={`x-toast${on ? " is-on" : ""}`} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
