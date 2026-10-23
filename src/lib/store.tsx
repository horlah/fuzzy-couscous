"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  DEMO_START,
  type Issue,
  type IssueKind,
  type Notice,
  type Room,
  SEED_ISSUES,
  SEED_ROOMS,
  type StaffId,
  staffById,
} from "./data";
import { ISSUE } from "./meta";

type State = {
  startedReal: number; // real ms when the demo clock read 9:41
  user: StaffId | null;
  lastUser: StaffId | null;
  rooms: Room[];
  issues: Issue[];
  notices: Notice[];
};

type Snapshot = Pick<State, "rooms" | "issues" | "notices">;

type Action =
  | { type: "sign-in"; user: StaffId }
  | { type: "sign-out" }
  | { type: "start"; roomId: string }
  | { type: "finish"; roomId: string; at: number }
  | { type: "report"; issue: Issue }
  | { type: "attach"; issueId: string; note?: string; photo?: string }
  | { type: "resume"; roomId: string }
  | { type: "fix"; issueId: string; by: StaffId }
  | { type: "inspect"; roomId: string; pass: boolean; reason?: string; by: StaffId }
  | { type: "seen"; ids: string[] }
  | { type: "restore"; snap: Snapshot }
  | { type: "reset" };

const KEY = "lance-ops-demo-v2";
const uid = () => Math.random().toString(36).slice(2, 9);

function fresh(): State {
  const now = Date.now();
  return {
    startedReal: now,
    user: null,
    lastUser: "maya",
    rooms: SEED_ROOMS.map((r) => (r.startedAt === -1 ? { ...r, startedAt: now - 8 * 60_000 } : { ...r })),
    issues: SEED_ISSUES.map((i) => ({ ...i })),
    notices: [],
  };
}

const patchRoom = (rooms: Room[], id: string, p: Partial<Room>) => rooms.map((r) => (r.id === id ? { ...r, ...p } : r));

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "sign-in":
      return { ...s, user: a.user, lastUser: a.user };
    case "sign-out":
      return { ...s, user: null };
    case "start":
      return { ...s, rooms: patchRoom(s.rooms, a.roomId, { status: "cleaning", startedAt: Date.now(), later: undefined }) };
    case "finish":
      return {
        ...s,
        rooms: patchRoom(s.rooms, a.roomId, { status: "clean", finishedAt: a.at, startedAt: undefined, sentBack: undefined }),
      };
    case "report": {
      const meta = ISSUE[a.issue.kind];
      let rooms = s.rooms;
      if (meta.pauseFor) {
        rooms = patchRoom(rooms, a.issue.roomId, {
          later: { reason: a.issue.kind, until: a.issue.at + meta.pauseFor },
          // a paused room is no longer being cleaned
          ...(s.rooms.find((r) => r.id === a.issue.roomId)?.status === "cleaning"
            ? { status: "dirty" as const, startedAt: undefined }
            : {}),
        });
      }
      const notices =
        meta.routeTo === "frontdesk"
          ? s.notices
          : [...s.notices, { id: uid(), to: meta.routeTo, text: `${staffById(a.issue.by)?.short} reported ${meta.label.toLowerCase()} in ${a.issue.roomId}`, seen: false }];
      return { ...s, rooms, issues: [a.issue, ...s.issues], notices };
    }
    case "attach":
      return {
        ...s,
        issues: s.issues.map((i) =>
          i.id === a.issueId ? { ...i, ...(a.note !== undefined ? { note: a.note } : {}), ...(a.photo ? { photo: a.photo } : {}) } : i,
        ),
      };
    case "resume": {
      const room = s.rooms.find((r) => r.id === a.roomId);
      const issues = s.issues.map((i) =>
        i.roomId === a.roomId && room?.later?.reason === i.kind && i.status === "open" ? { ...i, status: "fixed" as const } : i,
      );
      return { ...s, issues, rooms: patchRoom(s.rooms, a.roomId, { later: undefined }) };
    }
    case "fix": {
      const issue = s.issues.find((i) => i.id === a.issueId);
      if (!issue) return s;
      const fixer = staffById(a.by)?.short;
      return {
        ...s,
        issues: s.issues.map((i) => (i.id === a.issueId ? { ...i, status: "fixed", fixedBy: a.by } : i)),
        rooms: ISSUE[issue.kind].pauseFor ? patchRoom(s.rooms, issue.roomId, { later: undefined }) : s.rooms,
        notices: [
          ...s.notices,
          { id: uid(), to: issue.by, text: `${ISSUE[issue.kind].label} in ${issue.roomId} — resolved by ${fixer}`, seen: false },
        ],
      };
    }
    case "inspect": {
      const room = s.rooms.find((r) => r.id === a.roomId);
      const notices =
        room?.assignee && !a.pass
          ? [...s.notices, { id: uid(), to: room.assignee, text: `${a.roomId} sent back: ${a.reason}`, seen: false }]
          : s.notices;
      return {
        ...s,
        rooms: patchRoom(s.rooms, a.roomId, a.pass ? { status: "ready" } : { status: "dirty", sentBack: a.reason }),
        notices,
      };
    }
    case "seen":
      return { ...s, notices: s.notices.map((n) => (a.ids.includes(n.id) ? { ...n, seen: true } : n)) };
    case "restore":
      return { ...s, ...a.snap };
    case "reset":
      return fresh();
  }
}

type Ctx = {
  state: State;
  now: number; // simulated minutes since midnight
  dispatch: (a: Action) => void;
  snapshot: () => Snapshot;
  report: (roomId: string, kind: IssueKind) => Issue;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as State;
    } catch {}
    return fresh();
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Simulated wall clock: starts at 9:41 and runs in real time.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const now = DEMO_START + (tick - state.startedReal) / 60_000;
  const nowRef = useRef(now);
  nowRef.current = now;

  const snapshot = useCallback((): Snapshot => {
    const { rooms, issues, notices } = stateRef.current;
    return { rooms, issues, notices };
  }, []);

  const report = useCallback((roomId: string, kind: IssueKind) => {
    const issue: Issue = { id: uid(), roomId, kind, by: stateRef.current.user ?? "maya", at: nowRef.current, status: "open" };
    dispatch({ type: "report", issue });
    return issue;
  }, []);

  const value = useMemo(() => ({ state, now, dispatch, snapshot, report }), [state, now, snapshot, report]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

/** Light haptic tick on Android; silently ignored elsewhere. */
export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

/**
 * The housekeeper's queue, ordered by what actually matters on the floor:
 * 1) the room you're in, 2) empty rooms with a guest arriving (soonest first, rush first),
 * 3) empty rooms with no arrival, 4) stayovers (guest is out / later in the day).
 * Rooms you can't clean right now drop into "Later" with a retry time.
 */
export function queueFor(rooms: Room[], user: StaffId, now: number) {
  const mine = rooms.filter((r) => r.assignee === user);
  const active = mine.filter((r) => r.status === "cleaning");
  const later = mine.filter((r) => r.status === "dirty" && r.later && r.later.until > now);
  const todo = mine
    .filter((r) => r.status === "dirty" && !(r.later && r.later.until > now))
    .sort((a, b) => urgency(a) - urgency(b));
  const done = mine
    .filter((r) => r.status === "clean" || r.status === "ready")
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  return { active, todo, later, done, total: mine.length };
}

function urgency(r: Room) {
  let score = 0;
  if (r.sentBack) score -= 2000; // redo first: guest may be waiting on it
  if (r.occupancy === "empty" && r.arrival) score += r.arrival - (r.rush ? 600 : 0);
  else if (r.occupancy === "empty") score += 2000;
  else score += 3000;
  return score + Number(r.id) / 1000;
}

export type Reason = { text: string; tone: "urgent" | "soon" | "calm" };

/** One line that answers "why is this room here, in this order?" */
export function reasonFor(r: Room, now: number): Reason {
  if (r.sentBack) return { text: `Sent back: ${r.sentBack}`, tone: "urgent" };
  if (r.occupancy === "empty" && r.arrival) {
    const mins = r.arrival - now;
    return {
      text: `${r.rush ? "Early check-in" : "Guest arrives"} in ${mins <= 0 ? "now" : formatShort(mins)}`,
      tone: mins < 60 ? "urgent" : mins < 120 ? "soon" : "calm",
    };
  }
  if (r.occupancy === "empty") return { text: "Checked out · no arrival yet", tone: "calm" };
  return { text: "Guest staying · tidy while they're out", tone: "calm" };
}

function formatShort(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
