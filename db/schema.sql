-- RUTINA schema. PostgreSQL 16 self-host (gratis, Docker lokal).
-- Dipetakan 1:1 dari DESIGN.md bagian 5. Tanpa layanan cloud berbayar.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta'
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#073693',
    owner_id UUID NOT NULL REFERENCES users(id),
    invite_code TEXT NOT NULL UNIQUE,
    approval_mode TEXT NOT NULL DEFAULT 'single' CHECK (approval_mode IN ('single', 'quorum')),
    quorum INT NOT NULL DEFAULT 1,
    detect_conflict BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'contributor', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    rrule TEXT,
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
    status TEXT NOT NULL DEFAULT 'approved'
        CHECK (status IN ('approved', 'pending', 'rejected', 'needs_revision')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT end_after_start CHECK (end_at > start_at)
);

CREATE TABLE event_approvals (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    decision TEXT CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
    note TEXT NOT NULL DEFAULT '',
    decided_at TIMESTAMPTZ,
    PRIMARY KEY (event_id, approver_id)
);

CREATE TABLE event_attendees (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rsvp TEXT NOT NULL DEFAULT 'Mungkin',
    attendance TEXT CHECK (attendance IN ('done', 'absent')),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE reminders (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offset_minutes INT NOT NULL DEFAULT 30,
    PRIMARY KEY (event_id, user_id, offset_minutes)
);

CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    assignee_id UUID REFERENCES users(id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    read_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_group_start ON events (group_id, start_at);
CREATE INDEX idx_events_owner_start ON events (owner_user_id, start_at);
CREATE INDEX idx_notifications_user ON notifications (user_id) WHERE read_at IS NULL;
