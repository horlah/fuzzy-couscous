"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlarmClock,
  BedDouble,
  CheckCheck,
  ChevronUp,
  CircleCheck,
  ConciergeBell,
  DoorOpen,
  Flag,
  Info,
  Play,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { type Room, staffById } from "@/lib/data";
import { CLEAN_TYPE, ISSUE, OCCUPANCY, fmtAgo, fmtTime } from "@/lib/meta";
import { buzz, reasonFor, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FloorMap, LocationLine, RoomJourney, StatusPill } from "./status";

/** Start / finish with an Undo toast instead of a confirm dialog. */
export function useRoomActions() {
  const { dispatch, snapshot, now } = useStore();
  const start = (room: Room) => {
    buzz(16);
    const snap = snapshot();
    dispatch({ type: "start", roomId: room.id });
    toast(`Started room ${room.id}`, {
      description: "Timer is running.",
      icon: <Play className="size-4" />,
      action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
    });
  };
  const finish = (room: Room) => {
    buzz(24);
    const snap = snapshot();
    dispatch({ type: "finish", roomId: room.id, at: now });
    toast.success(`Room ${room.id} is clean`, {
      description: "Sent to Jordan for inspection.",
      action: { label: "Undo", onClick: () => dispatch({ type: "restore", snap }) },
    });
  };
  return { start, finish };
}

const SNAPS = [0.58, 1] as const;

/**
 * iOS-style sheet: opens at ~half height with what you need to act,
 * drag up (or tap "More details") to expand to full height for everything else.
 */
export function RoomSheet({
  roomId,
  expandOnOpen,
  onClose,
  onIssue,
}: {
  roomId: string | null;
  expandOnOpen?: boolean;
  onClose: () => void;
  onIssue: (id: string) => void;
}) {
  const { state, now } = useStore();
  const { start, finish } = useRoomActions();
  const [last, setLast] = useState<string | null>(roomId);
  const [snap, setSnap] = useState<number | string | null>(SNAPS[0]);
  useEffect(() => {
    if (roomId) {
      setLast(roomId);
      setSnap(expandOnOpen ? SNAPS[1] : SNAPS[0]);
    }
  }, [roomId, expandOnOpen]);
  const room = state.rooms.find((r) => r.id === (roomId ?? last));
  const expanded = snap === 1;
  if (!room) return null;

  const issues = state.issues.filter((i) => i.roomId === room.id);
  const reason = reasonFor(room, now);
  const Clean = CLEAN_TYPE[room.cleanType].icon;
  const Occ = OCCUPANCY[room.occupancy].icon;
  const who = staffById(room.assignee);

  return (
    <Drawer open={!!roomId} onOpenChange={(o) => !o && onClose()} snapPoints={[...SNAPS]} activeSnapPoint={snap} setActiveSnapPoint={setSnap} fadeFromIndex={0}>
      <DrawerContent className="mx-auto h-[96dvh] max-w-110 rounded-t-[28px] data-[vaul-drawer-direction=bottom]:max-h-[96dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[28px]">
        <div className={cn("flex-1 overscroll-contain px-6 pt-4 pb-[max(env(safe-area-inset-bottom),32px)]", expanded ? "overflow-y-auto" : "overflow-hidden")}>
          {/* ---- Always visible: identify the room and act ---- */}
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Room</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <DrawerTitle className="tabular text-5xl leading-none font-bold tracking-tight">{room.id}</DrawerTitle>
            <StatusPill status={room.status} />
          </div>
          <DrawerDescription asChild>
            <div className="mt-3 text-[15px] text-foreground">
              <LocationLine room={room} withLandmark />
            </div>
          </DrawerDescription>

          <p
            className={cn(
              "mt-3 flex items-center gap-2 text-[15px] font-semibold",
              reason.tone === "urgent" ? "text-st-dirty" : reason.tone === "soon" ? "text-st-cleaning" : "text-muted-foreground",
            )}
          >
            <AlarmClock className="size-4" /> {reason.text}
            {room.arrival && <span className="font-normal text-muted-foreground">· {fmtTime(room.arrival)}</span>}
          </p>

          <div className="mt-6 flex gap-3">
            {room.status === "dirty" && (
              <Button size="lg" className="press h-14 flex-[1.6] text-base" onClick={() => { start(room); onClose(); }}>
                <Play className="size-5" /> Start cleaning
              </Button>
            )}
            {room.status === "cleaning" && (
              <Button size="lg" className="press h-14 flex-[1.6] bg-st-ready text-base hover:bg-st-ready/90" onClick={() => { finish(room); onClose(); }}>
                <CheckCheck className="size-5" /> Done — clean
              </Button>
            )}
            <Button variant="outline" size="lg" className="press h-14 flex-1 text-base" onClick={() => onIssue(room.id)}>
              <Flag className="size-5" /> Issue
            </Button>
          </div>

          {/* Expand affordance — the handle can be dragged, this is the tap target */}
          <button
            onClick={() => {
              buzz(8);
              setSnap(expanded ? SNAPS[0] : SNAPS[1]);
            }}
            className="press mx-auto mt-6 flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-semibold"
            aria-expanded={expanded}
          >
            <ChevronUp className="size-4 transition-transform duration-300" style={{ transform: expanded ? "rotate(180deg)" : "none", transitionTimingFunction: "var(--ease-out)" }} />
            {expanded ? "Less" : "More details"}
            {!expanded && ((room.requests?.length ?? 0) + (room.instructions?.length ?? 0) > 0) && (
              <span className="tabular rounded-full bg-foreground px-1.5 text-[11px] leading-4.5 text-background">
                {(room.requests?.length ?? 0) + (room.instructions?.length ?? 0)}
              </span>
            )}
          </button>

          {/* ---- Expanded: everything else, in the order a housekeeper needs it ---- */}
          <motion.div
            initial={false}
            animate={{ opacity: expanded ? 1 : 0.35 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="mt-8 space-y-8"
          >
            {room.requests && room.requests.length > 0 && (
              <Block icon={<ConciergeBell className="size-4" />} title="Guest requests" count={room.requests.length}>
                <ul className="divide-y rounded-2xl border">
                  {room.requests.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                        {q.qty ? `×${q.qty}` : i + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-medium">{q.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {q.from} · {fmtTime(q.at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {room.instructions && room.instructions.length > 0 && (
              <Block icon={<Info className="size-4" />} title="Special instructions" count={room.instructions.length}>
                <ul className="space-y-2">
                  {room.instructions.map((t, i) => (
                    <li key={i} className="flex gap-3 rounded-2xl bg-st-clean-bg p-4 text-[15px] text-foreground">
                      <Info className="mt-0.5 size-4 shrink-0 text-st-clean" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            <Block title="Room progress">
              <RoomJourney status={room.status} />
            </Block>

            <Block title="Where it is">
              <FloorMap room={room} rooms={state.rooms} />
            </Block>

            <Block title="About this room">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Cell icon={<Clean className="size-4" />} label="Clean type">
                  {CLEAN_TYPE[room.cleanType].label}
                </Cell>
                <Cell icon={<AlarmClock className="size-4" />} label="Planned">
                  ~{room.minutes} min
                </Cell>
                <Cell icon={<Occ className="size-4" />} label="Guest">
                  {OCCUPANCY[room.occupancy].label}
                </Cell>
                <Cell icon={<BedDouble className="size-4" />} label="Beds">
                  {room.bed}
                </Cell>
              </dl>
            </Block>

            {issues.length > 0 && (
              <Block icon={<Flag className="size-4" />} title="Reported" count={issues.length}>
                <ul className="space-y-2">
                  {issues.map((i) => {
                    const m = ISSUE[i.kind];
                    const I = m.icon;
                    return (
                      <li key={i.id} className="flex items-center gap-3 rounded-2xl border p-4 text-sm">
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
              </Block>
            )}

            <Block title="Today">
              <ol className="relative space-y-4 border-l-2 border-black/10 pl-5">
                {room.checkedOutAt && <TimelineItem icon={<DoorOpen className="size-3.5" />} text="Guest checked out" at={room.checkedOutAt} />}
                {who && <TimelineItem icon={<Sparkles className="size-3.5" />} text={`Assigned to ${who.short}`} at={8 * 60} />}
                {room.startedAt && <TimelineItem icon={<Play className="size-3.5" />} text="Cleaning started" at={now - (Date.now() - room.startedAt) / 60000} />}
                {room.finishedAt && <TimelineItem icon={<CheckCheck className="size-3.5" />} text="Marked clean" at={room.finishedAt} />}
              </ol>
            </Block>
          </motion.div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Block({ icon, title, count, children }: { icon?: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
        {count !== undefined && <span className="tabular rounded-full bg-muted px-2 text-xs leading-5">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

function Cell({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

function TimelineItem({ icon, text, at }: { icon: React.ReactNode; text: string; at: number }) {
  return (
    <li className="relative text-sm">
      <span className="absolute top-0 -left-7.75 flex size-5 items-center justify-center rounded-full bg-background ring-2 ring-black/10">{icon}</span>
      <span className="font-medium">{text}</span>
      <span className="ml-2 text-muted-foreground">{fmtTime(at)}</span>
    </li>
  );
}
