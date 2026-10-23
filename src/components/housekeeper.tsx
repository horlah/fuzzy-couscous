"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  AlarmClock,
  BedDouble,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock4,
  ConciergeBell,
  Flag,
  Info,
  ListTodo,
  PartyPopper,
  Play,
  RotateCcw,
  Siren,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Issue, Room, StaffId } from "@/lib/data";
import { CLEAN_TYPE, ISSUE, OCCUPANCY, fmtTime, fmtTimer } from "@/lib/meta";
import { buzz, queueFor, reasonFor, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IssueSheet } from "./issue-sheet";
import { RoomSheet, useRoomActions } from "./room-sheet";
import { LocationLine, StatusPill } from "./status";
import { TopBar, useNotices } from "./shell";

const spring = { type: "spring" as const, duration: 0.45, bounce: 0.12 };
const ease = [0.23, 1, 0.32, 1] as const;

type Tab = "todo" | "later" | "done";
const TABS: { id: Tab; label: string; icon: typeof ListTodo }[] = [
  { id: "todo", label: "To do", icon: ListTodo },
  { id: "later", label: "Later", icon: Clock4 },
  { id: "done", label: "Done", icon: CircleCheck },
];

export function HousekeeperView({ me }: { me: StaffId }) {
  const { state, now } = useStore();
  const { active, todo, later, done, total } = queueFor(state.rooms, me, now);
  const [tab, setTab] = useState<Tab>("todo");
  const [dir, setDir] = useState(1);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: string; expand?: boolean } | null>(null);
  useNotices(me);

  const counts: Record<Tab, number> = { todo: active.length + todo.length, later: later.length, done: done.length };
  const go = (t: Tab) => {
    if (t === tab) return;
    buzz(8);
    setDir(TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === tab) ? 1 : -1);
    setTab(t);
  };
  const [next, ...rest] = todo;
  const openIssue = (id: string) => {
    buzz();
    setIssueFor(id);
  };
  const open = (id: string, expand?: boolean) => setDetail({ id, expand });

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        me={me}
        title="My rooms"
        subtitle={
          <span className="flex items-center gap-2.5">
            <ProgressRing value={done.length / total} />
            <span>
              <span className="tabular font-semibold text-foreground">
                {done.length} of {total}
              </span>{" "}
              rooms done
            </span>
          </span>
        }
        below={<Tabs tab={tab} counts={counts} onChange={go} />}
      />

      <main className="relative flex-1 overflow-x-clip px-5 pt-6 pb-[max(env(safe-area-inset-bottom),32px)]">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, transform: `translateX(${d * 24}px)` }),
              center: { opacity: 1, transform: "translateX(0px)" },
              exit: (d: number) => ({ opacity: 0, transform: `translateX(${d * -24}px)` }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease }}
            className="space-y-10"
          >
            <LayoutGroup>
              {tab === "todo" && (
                <>
                  {active.length > 0 && (
                    <Section title="Cleaning now" icon={<span className="live-dot size-2 rounded-full bg-st-cleaning" />}>
                      {active.map((r) => (
                        <RoomCard key={r.id} room={r} emphasis onIssue={openIssue} onOpen={open} />
                      ))}
                    </Section>
                  )}
                  {next && (
                    <Section title={active.length ? "Up next" : "Start here"} icon={<Siren className="size-4 text-st-dirty" />}>
                      <RoomCard key={next.id} room={next} emphasis={!active.length} onIssue={openIssue} onOpen={open} />
                    </Section>
                  )}
                  {rest.length > 0 && (
                    <Section title="Then" count={rest.length}>
                      {rest.map((r) => (
                        <RoomCard key={r.id} room={r} onIssue={openIssue} onOpen={open} />
                      ))}
                    </Section>
                  )}
                  {!active.length && !todo.length && (
                    <EmptyState
                      tone="ready"
                      icon={<PartyPopper className="size-10" strokeWidth={1.5} />}
                      title="Nothing left to clean"
                      text={later.length ? `${later.length} room${later.length > 1 ? "s are" : " is"} waiting in Later.` : "Jordan can see it on the board. Nice work."}
                    />
                  )}
                </>
              )}

              {tab === "later" && (
                <Section title="Can't clean right now" icon={<Clock4 className="size-4 text-st-cleaning" />} hint="These rooms go back to To do by themselves. The time is on each room.">
                  {later.map((r) => (
                    <LaterCard key={r.id} room={r} onOpen={open} />
                  ))}
                  {!later.length && (
                    <EmptyState icon={<Coffee className="size-9" strokeWidth={1.5} />} title="Nothing on hold" text="If a guest has Do not disturb up, tap Issue on the room — it lands here." />
                  )}
                </Section>
              )}

              {tab === "done" && (
                <Section title="Finished today" icon={<CircleCheck className="size-4 text-st-ready" />} hint="Rooms wait for Jordan's check before they're ready for a guest.">
                  {done.map((r) => (
                    <DoneCard key={r.id} room={r} onOpen={open} />
                  ))}
                  {!done.length && <EmptyState icon={<ListTodo className="size-9" strokeWidth={1.5} />} title="No rooms finished yet" text="Rooms you mark clean show up here." />}
                </Section>
              )}
            </LayoutGroup>
          </motion.div>
        </AnimatePresence>
      </main>

      <IssueSheet roomId={issueFor} open={!!issueFor} onOpenChange={(o) => !o && setIssueFor(null)} />
      <RoomSheet
        roomId={detail?.id ?? null}
        expandOnOpen={detail?.expand}
        onClose={() => setDetail(null)}
        onIssue={(id) => {
          setDetail(null);
          setTimeout(() => setIssueFor(id), 250);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Tabs({ tab, counts, onChange }: { tab: Tab; counts: Record<Tab, number>; onChange: (t: Tab) => void }) {
  return (
    <div role="tablist" aria-label="My rooms" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const selected = tab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={cn(
              "press relative flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors duration-200",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl bg-background shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
            <Count n={counts[id]} selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

/** Count badge that pops when its number changes — feedback that a room moved here. */
function Count({ n, selected }: { n: number; selected: boolean }) {
  const prev = useRef(n);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (prev.current !== n) setBump((b) => b + 1);
    prev.current = n;
  }, [n]);
  return (
    <motion.span
      key={bump}
      initial={bump ? { transform: "scale(1.35)" } : false}
      animate={{ transform: "scale(1)" }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.45 }}
      className={cn(
        "tabular relative min-w-5 rounded-full px-1.5 text-xs leading-5",
        selected ? "bg-foreground text-background" : "bg-black/10 text-foreground",
      )}
    >
      {n}
    </motion.span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth="3.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--st-ready)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }}
      />
    </svg>
  );
}

function Section({ title, icon, count, hint, children }: { title: string; icon?: React.ReactNode; count?: number; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        {icon}
        {title}
        {count !== undefined && <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{count}</span>}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-5">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </section>
  );
}

function EmptyState({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone?: "ready" }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.3, ease }}
      className={cn(
        "flex flex-col items-center rounded-3xl px-8 py-12 text-center",
        tone === "ready" ? "bg-st-ready-bg text-st-ready" : "border border-dashed text-muted-foreground",
      )}
    >
      {icon}
      <p className="mt-4 text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </motion.div>
  );
}

const cardMotion = {
  initial: { opacity: 0, transform: "scale(0.97)" },
  animate: { opacity: 1, transform: "scale(1)" },
  exit: { opacity: 0, transform: "scale(0.97)" },
  transition: spring,
};

/* ------------------------------------------------------------------ */

function RoomCard({
  room,
  emphasis,
  onIssue,
  onOpen,
}: {
  room: Room;
  emphasis?: boolean;
  onIssue: (id: string) => void;
  onOpen: (id: string, expand?: boolean) => void;
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
  const reqs = room.requests ?? [];
  const extras = reqs.length - 1 + (room.instructions?.length ?? 0);

  return (
    <motion.article
      layout
      layoutId={`room-${room.id}`}
      {...cardMotion}
      className={cn(
        "overflow-hidden rounded-[28px] border bg-card",
        emphasis && "border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-12px_rgba(0,0,0,0.22)]",
        cleaning && "ring-2 ring-st-cleaning/40",
      )}
    >
      {cleaning && (
        <div className="flex items-center justify-between bg-st-cleaning-bg px-5 py-3.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-st-cleaning">
            <span className="live-dot size-2 rounded-full bg-st-cleaning" /> Cleaning · {room.minutes} min planned
          </span>
          <span className={cn("tabular text-2xl font-bold transition-colors", over ? "text-st-dirty" : "text-st-cleaning")}>{fmtTimer(elapsed)}</span>
        </div>
      )}

      <button onClick={() => onOpen(room.id)} className="block w-full px-5 pt-5 pb-4 text-left" aria-label={`Room ${room.id} details`}>
        {/* Identity: what the number is, and where to walk */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Room</p>
            <p className="tabular mt-0.5 text-[40px] leading-none font-bold tracking-tight">{room.id}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {room.rush && (
              <span className="flex items-center gap-1 rounded-full bg-st-dirty px-2.5 py-1 text-xs font-bold text-white">
                <AlarmClock className="size-3.5" /> RUSH
              </span>
            )}
            {!cleaning && <StatusPill status={room.status} size="sm" />}
          </div>
        </div>
        <LocationLine room={room} className="mt-3 text-[15px] font-medium" />

        {/* Why this room, now */}
        <p
          className={cn(
            "mt-4 flex items-center gap-2 text-[15px] font-semibold",
            reason.tone === "urgent" ? "text-st-dirty" : reason.tone === "soon" ? "text-st-cleaning" : "text-muted-foreground",
          )}
        >
          {room.sentBack ? <RotateCcw className="size-4" /> : room.arrival ? <AlarmClock className="size-4" /> : <Occ className="size-4" />}
          {reason.text}
          {room.arrival && !room.sentBack && <span className="font-normal text-muted-foreground">· {fmtTime(room.arrival)}</span>}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <Fact icon={<Clean className="size-4" />}>
            {CLEAN_TYPE[room.cleanType].label} · ~{room.minutes}m
          </Fact>
          <Fact icon={<Occ className="size-4" />}>{OCCUPANCY[room.occupancy].label}</Fact>
          <Fact icon={<BedDouble className="size-4" />}>{room.bed}</Fact>
        </div>

        {(reqs.length > 0 || (room.instructions?.length ?? 0) > 0) && (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="flex items-start gap-2">
              {reqs[0] ? <ConciergeBell className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
              <span className="flex-1">
                {reqs[0] ? (
                  <>
                    {reqs[0].qty ? `${reqs[0].qty} × ` : ""}
                    {reqs[0].text}
                  </>
                ) : (
                  room.instructions![0]
                )}
              </span>
            </p>
            {extras > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(room.id, true);
                }}
                className="mt-1.5 ml-6 inline-flex items-center gap-0.5 font-semibold text-amber-800"
              >
                +{extras} more <ChevronRight className="size-3.5" />
              </span>
            )}
          </div>
        )}

        <IssueChips issues={issues} />
      </button>

      <div className="flex gap-3 px-5 pb-5">
        {cleaning ? (
          <Button size="lg" onClick={() => finish(room)} className="press h-14 flex-1 bg-st-ready text-base hover:bg-st-ready/90">
            <CheckCheck className="size-5" /> Done — room is clean
          </Button>
        ) : (
          <Button size="lg" onClick={() => start(room)} className="press h-14 flex-1 text-base">
            <Play className="size-5" /> {room.sentBack ? "Redo cleaning" : "Start cleaning"}
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onIssue(room.id)}
          className="press h-14 w-17 flex-col gap-0.5 text-[11px] font-semibold"
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
    <span className="flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

function IssueChips({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
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
              transition={{ duration: 0.2, ease }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
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

function LaterCard({ room, onOpen }: { room: Room; onOpen: (id: string) => void }) {
  const { dispatch, now } = useStore();
  const m = room.later ? ISSUE[room.later.reason] : null;
  const Icon = m?.icon ?? Clock4;
  return (
    <motion.article layout layoutId={`room-${room.id}`} {...cardMotion} className="rounded-[28px] border border-dashed bg-card p-5">
      <button onClick={() => onOpen(room.id)} className="flex w-full items-start justify-between text-left">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Room</p>
          <p className="tabular mt-0.5 text-[34px] leading-none font-bold tracking-tight">{room.id}</p>
          <LocationLine room={room} className="mt-3 text-sm text-muted-foreground" />
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-st-cleaning-bg px-3 py-1.5 text-xs font-semibold text-st-cleaning">
          <Icon className="size-3.5" /> {m?.label}
        </span>
      </button>
      <p className="mt-4 flex items-center gap-2 text-sm">
        <Clock4 className="size-4 text-muted-foreground" />
        {room.later && room.later.until - now < 600 ? (
          <span>
            Back in To do at <b>{fmtTime(room.later.until)}</b>
          </span>
        ) : (
          "Skipped for today"
        )}
      </p>
      <Button
        variant="outline"
        size="lg"
        className="press mt-4 h-12 w-full text-base"
        onClick={() => {
          buzz();
          dispatch({ type: "resume", roomId: room.id });
        }}
      >
        <RotateCcw /> Try now — move back to To do
      </Button>
    </motion.article>
  );
}

function DoneCard({ room, onOpen }: { room: Room; onOpen: (id: string) => void }) {
  return (
    <motion.article layout layoutId={`room-${room.id}`} {...cardMotion}>
      <button onClick={() => onOpen(room.id)} className="press flex w-full items-center gap-4 rounded-3xl border bg-card p-5 text-left">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className="tabular text-[28px] leading-none font-bold">{room.id}</span>
            <span className="text-sm text-muted-foreground">{room.finishedAt ? `Cleaned ${fmtTime(room.finishedAt)}` : ""}</span>
          </div>
          <LocationLine room={room} className="mt-2 text-sm text-muted-foreground" />
          <StatusPill status={room.status} size="sm" className="mt-3" />
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>
    </motion.article>
  );
}
