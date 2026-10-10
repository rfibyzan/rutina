export type Priority = 1 | 2 | 3 | 4;
export type Role = "owner" | "admin" | "editor" | "contributor" | "viewer";
export type EventStatus = "approved" | "pending";
export type Decision = "approved" | "rejected" | "needs_revision" | null;

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  group: string;
  groupColor: string;
  groupId?: string | null;
  day: string;
  dateLabel: string;
  start: string;
  end: string;
  startAt?: string;
  endAt?: string;
  priority: Priority;
  status: EventStatus;
  rsvp: "Hadir" | "Mungkin" | "Tidak";
  attendance?: "done" | "absent" | null;
  attendees: string[];
  extraAttendees: number;
  checklist: ChecklistItem[];
  note: string;
  location?: string;
}

export interface Group {
  id: string;
  name: string;
  short: string;
  members: number;
  next?: string;
  myRole: Role;
  color: string;
}

export interface Member {
  name: string;
  role: Role;
}

export interface Approval {
  id: string;
  title: string;
  requester: string;
  group?: string;
  eventId?: string;
  byMe?: boolean;
  when: string;
  conflict: string | null;
  decision: Decision;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  day: string;
}

export interface TaskItem {
  id: string;
  title: string;
  group: string;
  groupColor: string;
  groupId?: string | null;
  dueLabel: string;
  dueAt: string | null;
  priority: Priority;
  done: boolean;
  note: string;
}

export interface MyGroup {
  id: string;
  name: string;
  color: string;
  role: Role;
}

export interface NewPrefill {
  tab?: "event" | "task";
  groupId?: string | null;
  date?: string;
  start?: string;
  end?: string;
}

export interface NewEventInput {
  title: string;
  groupId: string | null;
  startAt: string;
  endAt: string;
  priority: Priority;
  status: EventStatus;
  note: string;
  location: string;
  rrule: string | null;
  reminderMinutes: number | null;
  attendeeEmails: string[];
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  1: "P1 Mendesak",
  2: "P2 Tinggi",
  3: "P3 Sedang",
  4: "P4 Rendah",
};

export const PRIORITY_VAR: Record<Priority, string> = {
  1: "var(--p1)",
  2: "var(--p2)",
  3: "var(--p3)",
  4: "var(--p4)",
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Pemilik",
  admin: "Admin",
  editor: "Editor",
  contributor: "Kontributor",
  viewer: "Pengikut",
};

export const seedEvents: EventItem[] = [
  {
    id: "kuliah-awan",
    title: "Kuliah Infrastruktur Awan",
    group: "Pribadi",
    groupColor: "#073693",
    day: "Jumat, 9 Okt",
    dateLabel: "Jum 9 Okt",
    start: "08:00",
    end: "10:00",
    priority: 2,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB"],
    extraAttendees: 0,
    checklist: [
      { label: "Siapkan laptop", done: true },
      { label: "Review materi arsitektur jaringan awan", done: false },
    ],
    note: "Ruang kelas reguler.",
  },
  {
    id: "piket-sekretariat",
    title: "Piket Sekretariat",
    group: "BEM FT",
    groupColor: "#F28C28",
    day: "Jumat, 9 Okt",
    dateLabel: "Jum 9 Okt",
    start: "13:00",
    end: "15:00",
    priority: 1,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB", "FS", "AD"],
    extraAttendees: 3,
    checklist: [
      { label: "Sapu ruangan", done: true },
      { label: "Rekap kas", done: false },
      { label: "Cek inventaris", done: false },
    ],
    note: "Dibuat oleh Admin BEM FT.",
  },
  {
    id: "rapat-medinfo",
    title: "Rapat Divisi Medinfo",
    group: "BEM FT",
    groupColor: "#F28C28",
    day: "Jumat, 9 Okt",
    dateLabel: "Jum 9 Okt",
    start: "16:00",
    end: "17:30",
    priority: 3,
    status: "approved",
    rsvp: "Mungkin",
    attendees: ["RB", "DS"],
    extraAttendees: 0,
    checklist: [{ label: "Siapkan evaluasi piket", done: false }],
    note: "Bentrok dengan Latihan Futsal 16:00.",
  },
  {
    id: "belajar-uts",
    title: "Belajar UTS",
    group: "Pribadi",
    groupColor: "#073693",
    day: "Jumat, 9 Okt",
    dateLabel: "Jum 9 Okt",
    start: "20:00",
    end: "22:00",
    priority: 2,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB"],
    extraAttendees: 0,
    checklist: [{ label: "Rangkuman sinyal dan sistem", done: false }],
    note: "",
  },
  {
    id: "rapat-kelompok-10",
    title: "Rapat Kelompok 10",
    group: "Kelompok 10 MPTI",
    groupColor: "#1F9D55",
    day: "Senin, 5 Okt",
    dateLabel: "Sen 5 Okt",
    start: "10:00",
    end: "12:00",
    priority: 3,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB", "FS", "AD"],
    extraAttendees: 0,
    checklist: [{ label: "Finalisasi laporan MPTI", done: false }],
    note: "",
  },
  {
    id: "latihan-futsal",
    title: "Latihan Futsal",
    group: "UKM Futsal",
    groupColor: "#9AA3B2",
    day: "Rabu, 7 Okt",
    dateLabel: "Rab 7 Okt",
    start: "15:00",
    end: "17:00",
    priority: 4,
    status: "approved",
    rsvp: "Tidak",
    attendees: ["RB"],
    extraAttendees: 0,
    checklist: [],
    note: "",
  },
  {
    id: "kuliah-jaringan",
    title: "Kuliah Jaringan",
    group: "Pribadi",
    groupColor: "#073693",
    day: "Selasa, 6 Okt",
    dateLabel: "Sel 6 Okt",
    start: "08:00",
    end: "10:00",
    priority: 3,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB"],
    extraAttendees: 0,
    checklist: [],
    note: "",
  },
  {
    id: "belajar-kam",
    title: "Belajar UTS",
    group: "Pribadi",
    groupColor: "#073693",
    day: "Kamis, 8 Okt",
    dateLabel: "Kam 8 Okt",
    start: "19:00",
    end: "21:00",
    priority: 2,
    status: "approved",
    rsvp: "Hadir",
    attendees: ["RB"],
    extraAttendees: 0,
    checklist: [],
    note: "",
  },
  {
    id: "bazar",
    title: "Bazar Dana Usaha",
    group: "BEM FT",
    groupColor: "#F28C28",
    day: "Sabtu, 10 Okt",
    dateLabel: "Sab 10 Okt",
    start: "09:00",
    end: "12:00",
    priority: 2,
    status: "pending",
    rsvp: "Mungkin",
    attendees: ["FS"],
    extraAttendees: 0,
    checklist: [],
    note: "Menunggu persetujuan Admin BEM FT.",
  },
];

export const seedGroups: Group[] = [
  { id: "bem-ft", name: "BEM FT", short: "BF", members: 42, myRole: "admin", color: "#F28C28" },
  { id: "kelompok-10", name: "Kelompok 10 MPTI", short: "K10", members: 3, myRole: "owner", color: "#1F9D55" },
  { id: "ukm-futsal", name: "UKM Futsal", short: "UF", members: 25, myRole: "viewer", color: "#9AA3B2" },
];

export const seedMembers: Member[] = [
  { name: "Rafi Byzan", role: "admin" },
  { name: "Frans S.", role: "editor" },
  { name: "Aufan D.", role: "contributor" },
  { name: "Dina A.", role: "viewer" },
];

export const seedApprovals: Approval[] = [
  { id: "ap-1", title: "Bazar Dana Usaha", requester: "Frans", when: "Sab 10 Okt, 09:00-12:00", conflict: null, decision: null },
  { id: "ap-2", title: "Rapat Evaluasi Piket", requester: "Aufan", when: "Sen 12 Okt, 19:00", conflict: "Bentrok 1", decision: null },
];

export const seedNotices: Notice[] = [
  { id: "n-1", title: "2 ajuan menunggu persetujuan", body: "Bazar Dana Usaha dan Rapat Evaluasi Piket menunggu keputusan Admin BEM FT.", day: "Jumat, 9 Okt" },
  { id: "n-2", title: "Pengingat: Piket Sekretariat 13:00", body: "Jangan lupa membawa kunci sekretariat dan rekap kas.", day: "Jumat, 9 Okt" },
  { id: "n-3", title: "Bentrok terdeteksi", body: "Rapat Divisi Medinfo bentrok dengan Latihan Futsal pukul 16:00.", day: "Kamis, 8 Okt" },
  { id: "n-4", title: "Role diubah", body: "Frans S. kini Editor di BEM FT.", day: "Rabu, 7 Okt" },
];

export const PERMISSION_ROWS: { label: string; values: (Role | null)[] }[] = [
  { label: "Lihat", values: ["owner", "admin", "editor", "contributor", "viewer"] },
  { label: "Ajukan", values: ["owner", "admin", "editor", "contributor", null] },
  { label: "Tambah langsung", values: ["owner", "admin", "editor", null, null] },
  { label: "Setujui", values: ["owner", "admin", null, null, null] },
  { label: "Kelola anggota", values: ["owner", "admin", null, null, null] },
];
