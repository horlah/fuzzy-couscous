"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  AlarmClock,
  ChevronDown,
  Clock4,
  Flag,
  NotebookPen,
  Play,
  RotateCcw,
  Siren,
  CircleCheck,
  CheckCheck,

  Wrench,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Issue, Room, StaffId } from "@/lib/data";
import { CLEAN_TYPE, ISSUE, OCCUPANCY, STATUS, fmtAgo, fmtTime, fmtTimer } from "@/lib/meta";
import { buzz, queueFor, reasonFor, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IssueSheet } from "./issue-sheet";
import { StatusPill, StatusSteps } from "./status";
import { TopBar, useNotices } from "./shell";

const spring = { type: "spring" as const, duration: 0.45, bounce: 0.12 };

export function HousekeeperView({ me }: { me: StaffId }) {
  const { state, now } = useStore();
  const { active, todo, later, done, total } = queueFor(state.rooms, me, now);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  useNotices(me);

  const [next, ...rest] = todo;
  const openIssue = (id: string) => {
    buzz();
    setIssueFor(id);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        me={me}
        title="My rooms"
        subtitle={
          <span className="flex items-center gap-2">
            <span className="tabular font-semibold text-foreground">
              {done.length} of {total}
            </span>
            done
            <ProgressBar value={done.length / total} />
          </span>
        }
      />

      <main className="flex-1 space-y-6 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),24px)]">
        <LayoutGroup>
          {active.length > 0 && (
            <Section title="Cleaning now" icon={<span className="live-dot size-2 rounded-full bg-st-cleaning" />}>
              {active.map((r) => (
                <RoomCard key={r.id} room={r} emphasis onIssue={openIssue} onOpen={setDetail} />
              ))}
            </Section>
          )}

          {next && (
            <Section title={active.length ? "Up next" : "Start here"} icon={<Siren className="size-4 text-st-dirty" />}>
              <RoomCard key={next.id} room={next} emphasis={!active.length} onIssue={openIssue} onOpen={setDetail} />
            </Section>
          )}

          {rest.length > 0 && (
            <Section title="Then" count={rest.length}>
              {rest.map((r) => (
                <RoomCard key={r.id} room={r} onIssue={openIssue} onOpen={setDetail} />
              ))}
            </Section>
          )}

          {!active.length && !todo.length && (
            <motion.div
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              className="flex flex-col items-center rounded-3xl bg-st-ready-bg px-6 py-8 text-center"
            >
              <PartyPopper className="size-10 text-st-ready" strokeWidth={1.5} />
              <p className="mt-3 text-lg font-semibold">All your rooms are done</p>
              <p className="text-sm text-muted-foreground">Jordan can see it on the board. Nice work.</p>
            </motion.div>
          )}

          {later.length > 0 && (
            <Section title="Later" icon={<Clock4 className="size-4 text-st-cleaning" />} count={later.length}>
              {later.map((r) => (
                <LaterCard key={r.id} room={r} />
              ))}
            </Section>
          )}

          <section>
            <button
              onClick={() => setShowDone((s) => !s)}
              className="press flex w-full items-center gap-2 py-1 text-sm font-semibold"
              aria-expanded={showDone}
            >
              <CircleCheck className="size-4 text-st-ready" /> Done today
              <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{done.length}</span>
              <ChevronDown
                className="ml-auto size-4 text-muted-foreground transition-transform duration-200"
                style={{ transform: showDone ? "rotate(180deg)" : "none" }}
              />
            </button>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="mt-2 overflow-hidden"
                >
                  {done.map((r) => (
                    <DoneRow key={r.id} room={r} onOpen={setDetail} />
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        </LayoutGroup>
      </main>

      <IssueSheet roomId={issueFor} open={!!issueFor} onOpenChange={(o) => !o && setIssueFor(null)} />
      <RoomSheet
        roomId={detail}
        onClose={() => setDetail(null)}
        onIssue={(id) => {
          setDetail(null);
          setTimeout(() => setIssueFor(id), 250);
        }}
      />
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon?: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
        {count !== undefined && <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{count}</span>}
      </h2>
      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </section>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span className="relative inline-block h-1.5 w-20 overflow-hidden rounded-full bg-black/10">
      <span
        className="absolute inset-0 origin-left rounded-full bg-st-ready"
        style={{ transform: `scaleX(${value})`, transition: "transform 500ms var(--ease-out)" }}
      />
    </span>
  );
}

/** Hooks shared by every surface that can start/finish a room. Every change has an Undo. */
function useRoomActions() {
  const { dispatch, snapshot, now } = useStore();
  const start = (room: Room) => {
    buzz(16);
    const snap = snapshot();
    dispatch({ type: "start", roomId: room.id });
    toast(`Started ${room.id}`, {
      description: "Timer is running.",
      icon: <Play className="size-4" />,
      action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
    });
  };
  const finish = (room: Room) => {
    buzz(24);
    const snap = snapshot();
    dispatch({ type: "finish", roomId: room.id, at: now });
    toast.success(`${room.id} is clean`, {
      description: "Sent to Jordan for inspection.",
      action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
    });
  };
  return { start, finish };
}

function RoomCard({
  room,
  emphasis,
  onIssue,
  onOpen,
}: {
  room: Room;
  emphasis?: boolean;
  onIssue: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { now, state } = useStore();
  const { start, finish } = useRoomActions();
  const issues = state.issues.filter((i) => i.roomId === room.id && (i.status === "open" || now - i.at < 120));
  const reason = reasonFor(room, now);
  const Clean = CLEAN_TYPE[room.cleanType].icon;
  const Occ = OCCUPANCY[room.occupancy].icon;
  const cleaning = room.status === "cleaning";
  const elapsed = cleaning && room.startedAt ? Date.now() - room.startedAt : 0;
  const over = elapsed > room.minutes * 60_000;

  return (
    <motion.article
      layout
      layoutId={`room-${room.id}`}
      initial={{ opacity: 0, transform: "scale(0.97)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      exit={{ opacity: 0, transform: "scale(0.97)" }}
      transition={spring}
      className={cn(
        "overflow-hidden rounded-3xl border bg-card",
        emphasis && "border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)]",
        cleaning && "ring-2 ring-st-cleaning/40",
      )}
    >
      {cleaning && (
        <div className="flex items-center justify-between bg-st-cleaning-bg px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-st-cleaning">
            <span className="live-dot size-2 rounded-full bg-st-cleaning" /> Cleaning · {room.minutes} min planned
          </span>
          <span className={cn("tabular text-2xl font-bold", over ? "text-st-dirty" : "text-st-cleaning")}>{fmtTimer(elapsed)}</span>
        </div>
      )}

      <button onClick={() => onOpen(room.id)} className="block w-full p-4 pb-3 text-left" aria-label={`Room ${room.id} details`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="tabular text-[34px] leading-none font-bold tracking-tight">{room.id}</span>
            {!cleaning && <StatusPill status={room.status} size="sm" />}
          </div>
          {room.rush && (
            <span className="flex items-center gap-1 rounded-full bg-st-dirty px-2 py-0.5 text-xs font-bold text-white">
              <AlarmClock className="size-3.5" /> RUSH
            </span>
          )}
        </div>

        <p
          className={cn(
            "mt-2.5 flex items-center gap-1.5 text-[15px] font-semibold",
            reason.tone === "urgent" ? "text-st-dirty" : reason.tone === "soon" ? "text-st-cleaning" : "text-muted-foreground",
          )}
        >
          {room.sentBack ? <RotateCcw className="size-4" /> : room.arrival ? <AlarmClock className="size-4" /> : <Occ className="size-4" />}
          {reason.text}
          {room.arrival && !room.sentBack && <span className="font-normal text-muted-foreground">· {fmtTime(room.arrival)}</span>}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <Fact icon={<Clean className="size-3.5" />}>
            {CLEAN_TYPE[room.cleanType].label} · ~{room.minutes}m
          </Fact>
          <Fact icon={<Occ className="size-3.5" />}>{OCCUPANCY[room.occupancy].label}</Fact>
          <Fact>{room.bed}</Fact>
        </div>

        {room.note && (
          <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            <NotebookPen className="mt-0.5 size-3.5 shrink-0" /> {room.note}
          </p>
        )}

        <IssueChips issues={issues} />

        <div className="mt-3">
          <StatusSteps status={room.status} />
        </div>
      </button>

      <div className="flex gap-2 px-4 pb-4">
        {cleaning ? (
          <Button size="lg" onClick={() => finish(room)} className="press h-14 flex-1 bg-st-ready text-base hover:bg-st-ready/90">
            <CheckCheck className="size-5" /> Done — room is clean
          </Button>
        ) : (
          <Button size="lg" onClick={() => start(room)} className={cn("press h-14 flex-1 text-base", !emphasis && "h-12")}>
            <Play className="size-5" /> {room.sentBack ? "Redo cleaning" : "Start cleaning"}
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onIssue(room.id)}
          className={cn("press h-14 w-16 flex-col gap-0.5 text-[11px] font-semibold", !emphasis && !cleaning && "h-12")}
          aria-label={`Report an issue in ${room.id}`}
        >
          <Flag className="size-5" />
          Issue
        </Button>
      </div>
    </motion.article>
  );
}

function Fact({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      {icon}
      {children}
    </span>
  );
}

function IssueChips({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {issues.map((i) => {
          const m = ISSUE[i.kind];
          const Icon = i.status === "fixed" ? CircleCheck : m.icon;
          return (
            <motion.span
              key={i.id}
              layout
              initial={{ opacity: 0, transform: "scale(0.9)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              exit={{ opacity: 0, transform: "scale(0.9)" }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                i.status === "fixed" ? "bg-st-ready-bg text-st-ready" : "bg-st-blocked-bg text-st-blocked",
              )}
            >
              <Icon className="size-3.5" />
              {m.label} · {i.status === "fixed" ? "fixed" : `sent to ${m.routeLabel.split(" ·")[0]}`}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function LaterCard({ room }: { room: Room }) {
  const { dispatch, now } = useStore();
  const m = room.later ? ISSUE[room.later.reason] : null;
  const Icon = m?.icon ?? Clock4;
  return (
    <motion.article
      layout
      layoutId={`room-${room.id}`}
      initial={{ opacity: 0, transform: "scale(0.97)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      exit={{ opacity: 0, transform: "scale(0.97)" }}
      transition={spring}
      className="flex items-center gap-3 rounded-2xl border border-dashed bg-card/60 p-3"
    >
      <span className="tabular w-14 text-2xl font-bold text-muted-foreground">{room.id}</span>
      <span className="flex-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon className="size-4 text-st-cleaning" /> {m?.label}
        </span>
        <span className="text-muted-foreground">
          {room.later && room.later.until - now < 600 ? `Back on your list at ${fmtTime(room.later.until)}` : "Skipped for today"}
        </span>
      </span>
      <Button
        variant="outline"
        className="press h-11"
        onClick={() => {
          buzz();
          dispatch({ type: "resume", roomId: room.id });
        }}
      >
        <RotateCcw /> Try now
      </Button>
    </motion.article>
  );
}

function DoneRow({ room, onOpen }: { room: Room; onOpen: (id: string) => void }) {
  return (
    <li>
      <button onClick={() => onOpen(room.id)} className="press flex w-full items-center gap-3 border-b py-3 text-left">
        <span className="tabular w-14 text-xl font-bold text-muted-foreground">{room.id}</span>
        <StatusPill status={room.status} size="sm" />
        <span className="ml-auto text-xs text-muted-foreground">{room.finishedAt ? fmtTime(room.finishedAt) : ""}</span>
      </button>
    </li>
  );
}

function RoomSheet({ roomId, onClose, onIssue }: { roomId: string | null; onClose: () => void; onIssue: (id: string) => void }) {
  const { state, now } = useStore();
  const { start, finish } = useRoomActions();
  const [last, setLast] = useState<string | null>(roomId);
  useEffect(() => {
    if (roomId) setLast(roomId);
  }, [roomId]);
  const room = state.rooms.find((r) => r.id === (roomId ?? last));
  const issues = state.issues.filter((i) => i.roomId === room?.id);

  return (
    <Drawer open={!!roomId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-w-[440px] pb-[env(safe-area-inset-bottom)]">
        {room && (
          <>
            <DrawerHeader className="!text-left">
              <div className="flex items-center gap-3">
                <DrawerTitle className="tabular text-4xl font-bold">{room.id}</DrawerTitle>
                <StatusPill status={room.status} />
              </div>
              <DrawerDescription>{STATUS[room.status].hint}</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[60dvh] space-y-4 overflow-y-auto overscroll-contain px-4">
              <StatusSteps status={room.status} showLabels />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Cell icon={<AlarmClock className="size-4" />} label="Next guest">
                  {room.arrival ? `${fmtTime(room.arrival)}${room.rush ? " · rush" : ""}` : "No arrival today"}
                </Cell>
                <Cell icon={(() => { const I = OCCUPANCY[room.occupancy].icon; return <I className="size-4" />; })()} label="Room">
                  {OCCUPANCY[room.occupancy].label}
                </Cell>
                <Cell icon={(() => { const I = CLEAN_TYPE[room.cleanType].icon; return <I className="size-4" />; })()} label="Clean">
                  {CLEAN_TYPE[room.cleanType].label} · ~{room.minutes}m
                </Cell>
                <Cell label="Beds">{room.bed}</Cell>
              </dl>
              {room.note && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <NotebookPen className="mt-0.5 size-4 shrink-0" /> {room.note}
                </p>
              )}
              {issues.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reported</p>
                  <ul className="space-y-2">
                    {issues.map((i) => {
                      const m = ISSUE[i.kind];
                      const I = m.icon;
                      return (
                        <li key={i.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                          <I className="size-5" />
                          <span className="flex-1">
                            <b>{m.label}</b>
                            <span className="block text-muted-foreground">
                              {fmtAgo(now - i.at)} · {i.status === "fixed" ? "fixed" : `with ${m.routeLabel}`}
                            </span>
                          </span>
                          {i.status === "fixed" ? <CircleCheck className="size-5 text-st-ready" /> : <Wrench className="size-4 text-muted-foreground" />}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4">
              {room.status === "dirty" && (
                <Button size="lg" className="press h-14 flex-1 text-base" onClick={() => { start(room); onClose(); }}>
                  <Play className="size-5" /> Start cleaning
                </Button>
              )}
              {room.status === "cleaning" && (
                <Button size="lg" className="press h-14 flex-1 bg-st-ready text-base hover:bg-st-ready/90" onClick={() => { finish(room); onClose(); }}>
                  <CheckCheck className="size-5" /> Done — room is clean
                </Button>
              )}
              <Button variant="outline" size="lg" className="press h-14 flex-1 text-base" onClick={() => onIssue(room.id)}>
                <Flag className="size-5" /> Report issue
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Cell({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

