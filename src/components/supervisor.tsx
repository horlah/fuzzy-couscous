"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BedDouble, Check, CircleCheck, Flag, Inbox, RotateCcw, ShieldCheck, Sparkles, Trash2, Bath, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { type Issue, type Room, type RoomStatus, type StaffId, staffById } from "@/lib/data";
import { ISSUE, STATUS, fmtAgo, fmtTime } from "@/lib/meta";
import { buzz, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./status";
import { TopBar, useNotices } from "./shell";

const ease = [0.23, 1, 0.32, 1] as const;

export function SupervisorView({ me }: { me: StaffId }) {
  const { state } = useStore();
  useNotices(me);
  const openIssues = state.issues.filter((i) => i.status === "open").sort((a, b) => b.at - a.at);
  const toInspect = state.rooms.filter((r) => r.status === "clean").sort((a, b) => (a.arrival ?? 9999) - (b.arrival ?? 9999));
  const [sendBack, setSendBack] = useState<string | null>(null);
  const counts = (s: RoomStatus) => state.rooms.filter((r) => r.status === s).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar me={me} title={staffById(me)?.role === "maintenance" ? "Maintenance & board" : "Hotel board"} />
      <main className="flex-1 space-y-10 px-5 pt-6 pb-[max(env(safe-area-inset-bottom),24px)]">
        <div className="grid grid-cols-4 gap-3">
          {(["dirty", "cleaning", "clean", "ready"] as RoomStatus[]).map((s) => {
            const m = STATUS[s];
            const Icon = m.icon;
            return (
              <div key={s} className={cn("rounded-2xl p-3", m.bg)}>
                <Icon className={cn("size-4", m.fg)} />
                <p className={cn("tabular mt-1 text-2xl font-bold", m.fg)}>{counts(s)}</p>
                <p className="text-[11px] leading-tight font-medium text-foreground/70">{m.short}</p>
              </div>
            );
          })}
        </div>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
            <Flag className="size-4 text-st-dirty" /> Reported from rooms
            <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{openIssues.length}</span>
          </h2>
          <div className="space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
              {openIssues.map((i) => (
                <IssueCard key={i.id} issue={i} />
              ))}
            </AnimatePresence>
            {!openIssues.length && <Empty text="Nothing reported. All clear." />}
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles className="size-4 text-st-clean" /> Ready to inspect
            <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{toInspect.length}</span>
          </h2>
          <div className="space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
              {toInspect.map((r) => (
                <InspectCard key={r.id} room={r} onSendBack={() => setSendBack(r.id)} />
              ))}
            </AnimatePresence>
            {!toInspect.length && <Empty text="No rooms waiting for inspection." />}
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
            <BedDouble className="size-4" /> All rooms
          </h2>
          {[1, 2, 3].map((f) => (
            <div key={f} className="mb-6">
              <p className="mb-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Floor {f}</p>
              <div className="grid grid-cols-4 gap-2.5">
                {state.rooms
                  .filter((r) => r.floor === f)
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map((r) => (
                    <Tile key={r.id} room={r} flagged={openIssues.some((i) => i.roomId === r.id)} />
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <SendBackSheet roomId={sendBack} onClose={() => setSendBack(null)} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
      <Inbox className="size-4" /> {text}
    </p>
  );
}

const cardMotion = {
  layout: true,
  initial: { opacity: 0, transform: "translateY(6px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  exit: { opacity: 0, transform: "scale(0.97)" },
  transition: { duration: 0.22, ease },
};

function IssueCard({ issue }: { issue: Issue }) {
  const { now, dispatch, state, snapshot } = useStore();
  const m = ISSUE[issue.kind];
  const Icon = m.icon;
  const by = staffById(issue.by)!;
  const pause = !!m.pauseFor;
  return (
    <motion.article {...cardMotion} className="rounded-3xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", pause ? "bg-st-cleaning-bg text-st-cleaning" : "bg-st-blocked-bg text-st-blocked")}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            <span className="tabular">{issue.roomId}</span> · {m.label}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar staff={by} size={16} /> {by.short} · {fmtAgo(now - issue.at)} · {pause ? "room paused" : `→ ${m.routeLabel}`}
          </p>
          {issue.note && <p className="mt-1.5 text-sm">“{issue.note}”</p>}
        </div>
        {issue.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={issue.photo} alt="" className="size-14 rounded-lg object-cover" />
        )}
      </div>
      <Button
        variant="outline"
        className="press mt-4 h-12 w-full"
        onClick={() => {
          buzz();
          const snap = snapshot();
          dispatch({ type: "fix", issueId: issue.id, by: state.user! });
          toast.success(pause ? `${issue.roomId} back on ${by.short}'s list` : `${m.label} in ${issue.roomId} fixed`, {
            description: `${by.short} gets a notice on their phone.`,
            action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
          });
        }}
      >
        <CircleCheck /> {pause ? "Clear — room can be cleaned" : "Mark fixed"}
      </Button>
    </motion.article>
  );
}

function InspectCard({ room, onSendBack }: { room: Room; onSendBack: () => void }) {
  const { dispatch, state, snapshot } = useStore();
  const who = staffById(room.assignee);
  return (
    <motion.article {...cardMotion} className="rounded-3xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="tabular text-3xl font-bold">{room.id}</span>
        <div className="flex-1 text-sm">
          <p className="flex items-center gap-1.5 font-semibold">
            {who && <Avatar staff={who} size={18} />} {who?.short ?? "—"} · cleaned {room.finishedAt ? fmtTime(room.finishedAt) : ""}
          </p>
          <p className="text-muted-foreground">{room.arrival ? `Guest arrives ${fmtTime(room.arrival)}` : "No arrival today"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="press h-12 flex-1" onClick={onSendBack}>
          <RotateCcw /> Send back
        </Button>
        <Button
          className="press h-12 flex-[1.4] bg-st-ready hover:bg-st-ready/90"
          onClick={() => {
            buzz(16);
            const snap = snapshot();
            dispatch({ type: "inspect", roomId: room.id, pass: true, by: state.user! });
            toast.success(`${room.id} is ready for the guest`, {
              icon: <ShieldCheck className="size-4" />,
              action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
            });
          }}
        >
          <Check /> Pass · Ready
        </Button>
      </div>
    </motion.article>
  );
}

function Tile({ room, flagged }: { room: Room; flagged: boolean }) {
  const m = STATUS[room.status];
  const Icon = m.icon;
  const who = staffById(room.assignee);
  return (
    <div className={cn("relative rounded-xl p-2.5 transition-colors duration-300", m.bg)}>
      {flagged && (
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-st-dirty text-white ring-2 ring-background">
          <Flag className="size-3" />
        </span>
      )}
      <p className="tabular text-base font-bold">{room.id}</p>
      <p className={cn("flex items-center gap-1 text-[11px] font-semibold", m.fg)}>
        <Icon className="size-3" /> {m.short}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{who?.short ?? "Unassigned"}</p>
    </div>
  );
}

const REASONS = [
  { label: "Bathroom", icon: Bath },
  { label: "Bed not made right", icon: BedDouble },
  { label: "Trash left", icon: Trash2 },
  { label: "Supplies missing", icon: PackageOpen },
];

function SendBackSheet({ roomId, onClose }: { roomId: string | null; onClose: () => void }) {
  const { dispatch, state } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  return (
    <Drawer open={!!roomId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-w-[440px] pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="!text-left">
          <DrawerTitle className="text-xl">Send {roomId} back — what&apos;s wrong?</DrawerTitle>
          <DrawerDescription>It goes to the top of {staffById(room?.assignee)?.short ?? "their"}&apos;s list.</DrawerDescription>
        </DrawerHeader>
        <div className="grid grid-cols-2 gap-2 px-4 pb-6">
          {REASONS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                if (!roomId) return;
                buzz(16);
                dispatch({ type: "inspect", roomId, pass: false, reason: label.toLowerCase(), by: state.user! });
                toast(`${roomId} sent back`, { description: label, icon: <RotateCcw className="size-4" /> });
                onClose();
              }}
              className="press flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold active:bg-muted"
            >
              <Icon className="size-6" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
