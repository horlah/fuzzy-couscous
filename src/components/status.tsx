"use client";

import { cn } from "@/lib/utils";
import { STATUS, STEPS } from "@/lib/meta";
import type { RoomStatus, Staff } from "@/lib/data";

/** Colour + icon + plain words. Never colour alone. */
export function StatusPill({ status, className, size = "md" }: { status: RoomStatus; className?: string; size?: "sm" | "md" }) {
  const m = STATUS[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-300",
        size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-xs",
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

/** Four-step progress: Dirty → Cleaning → Clean → Ready. Shows where the room is in its day. */
export function StatusSteps({ status, showLabels = false }: { status: RoomStatus; showLabels?: boolean }) {
  const current = STATUS[status].step;
  return (
    <div role="img" aria-label={`Step ${current + 1} of 4: ${STATUS[status].label}`}>
      <div className="flex gap-1">
        {STEPS.map((s, i) => {
          const reached = i <= current;
          return (
            <span key={s} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
              <span
                className={cn("absolute inset-0 origin-left rounded-full", STATUS[status].bar)}
                style={{
                  transform: `scaleX(${reached ? 1 : 0})`,
                  transition: `transform 350ms var(--ease-out) ${i * 50}ms`,
                }}
              />
            </span>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex text-[11px] font-medium text-muted-foreground">
          {STEPS.map((s, i) => {
            const Icon = STATUS[s].icon;
            return (
              <span key={s} className={cn("flex flex-1 items-center gap-1", i === current && "font-semibold text-foreground")}>
                <Icon className="size-3" aria-hidden />
                {STATUS[s].short}
              </span>
            );
          })}
        </div>
      )}
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
