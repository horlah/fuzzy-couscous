"use client";

import { Fragment } from "react";
import { motion } from "motion/react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS, STEPS, locationOf } from "@/lib/meta";
import type { Room, RoomStatus, Staff } from "@/lib/data";

/** Colour + icon + plain words. Never colour alone. */
export function StatusPill({ status, className, size = "md" }: { status: RoomStatus; className?: string; size?: "sm" | "md" }) {
  const m = STATUS[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-300",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        m.bg,
        m.fg,
        className,
      )}
    >
      {status === "cleaning" ? (
        <span className="live-dot size-2 rounded-full bg-current" aria-hidden />
      ) : (
        <Icon className={size === "md" ? "size-4" : "size-3.5"} strokeWidth={2.25} aria-hidden />
      )}
      {m.label}
    </span>
  );
}

const NEXT_STEP: Record<RoomStatus, string> = {
  dirty: "Next: you start cleaning",
  cleaning: "Next: tap Done when the room is clean",
  clean: "Next: supervisor checks the room",
  ready: "Done — the room can be given to a guest",
};

/**
 * The room's journey through the day, labelled so it reads at a glance:
 * past steps are ticked, the current one is highlighted with its icon, future ones are grey.
 * Colour only marks "where you are now" — it never encodes progress on its own.
 */
export function RoomJourney({ status }: { status: RoomStatus }) {
  const current = STATUS[status].step;
  return (
    <div>
      <p className="text-[15px] font-semibold">
        Step {current + 1} of 4 · {STATUS[status].label}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{NEXT_STEP[status]}</p>
      <ol className="mt-5 grid grid-cols-4">
        {STEPS.map((s, i) => {
          const m = STATUS[s];
          const Icon = m.icon;
          const done = i < current;
          const now = i === current;
          return (
            <li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span className="absolute top-[18px] right-1/2 h-0.5 w-full -translate-y-1/2 overflow-hidden bg-black/10" aria-hidden>
                  <span
                    className="absolute inset-0 origin-left bg-st-ready"
                    style={{ transform: `scaleX(${i <= current ? 1 : 0})`, transition: `transform 400ms var(--ease-out) ${i * 80}ms` }}
                  />
                </span>
              )}
              <span
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  done && "border-st-ready bg-st-ready text-white",
                  now && "border-foreground bg-foreground text-background ring-4 ring-black/10",
                  !done && !now && "border-black/10 bg-background text-black/25",
                )}
              >
                {done ? (
                  <motion.span initial={{ transform: "scale(0.6)" }} animate={{ transform: "scale(1)" }} transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}>
                    <Check className="size-4" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <Icon className="size-4" strokeWidth={2.25} />
                )}
              </span>
              <span className={cn("mt-2 text-xs leading-tight", now ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.short}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Location in words: "Floor 2 · East wing". */
export function LocationLine({ room, className, withLandmark }: { room: Pick<Room, "id" | "floor">; className?: string; withLandmark?: boolean }) {
  const l = locationOf(room);
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <MapPin className="size-4 shrink-0" />
      {l.floorLabel} · {l.wing}
      {withLandmark && <span className="text-muted-foreground">· {l.landmark}</span>}
    </span>
  );
}

/** A tiny corridor diagram: where this door is on the floor, relative to stairs and elevator. */
export function FloorMap({ room, rooms }: { room: Room; rooms: Room[] }) {
  const onFloor = rooms.filter((r) => r.floor === room.floor).sort((a, b) => a.id.localeCompare(b.id));
  const l = locationOf(room);
  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <p className="text-[15px] font-semibold">
        {l.floorLabel} · {l.wing}
      </p>
      <p className="text-sm text-muted-foreground">Door {room.id}, {l.landmark}</p>
      <div className="mt-4 flex items-end gap-1.5">
        <Landmark label="Stairs" />
        {onFloor.map((r) => {
          const me = r.id === room.id;
          const afterLift = Number(r.id.slice(-2)) === 4;
          return (
            <Fragment key={r.id}>
            {afterLift && <Landmark label="Lift" />}
            <div className="flex flex-1 flex-col items-center gap-1">
              {me ? (
                <motion.span
                  initial={{ opacity: 0, transform: "translateY(-4px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                >
                  <MapPin className="size-4 text-st-dirty" fill="currentColor" stroke="white" />
                </motion.span>
              ) : (
                <span className="size-4" />
              )}
              <span
                className={cn(
                  "tabular flex h-9 w-full items-center justify-center rounded-md text-[11px] font-semibold",
                  me ? "bg-foreground text-background" : "bg-background text-muted-foreground ring-1 ring-black/10",
                )}
              >
                {r.id.slice(-2)}
              </span>
            </div>
            </Fragment>
          );
        })}
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-black/10" aria-hidden />
      <p className="mt-1 text-center text-[11px] text-muted-foreground">Corridor</p>
    </div>
  );
}

function Landmark({ label }: { label: string }) {
  return (
    <div className="flex w-9 flex-col items-center gap-1">
      <span className="size-4" />
      <span className="flex h-9 w-full items-center justify-center rounded-md border border-dashed text-[9px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function Avatar({ staff, size = 36 }: { staff: Staff; size?: number }) {
  const initials = staff.name
    .split(" ")
    .map((p) => p[0])
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: staff.tint, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
