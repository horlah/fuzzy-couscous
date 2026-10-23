"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Delete, Hotel, Search } from "lucide-react";
import { STAFF, type StaffId, staffById } from "@/lib/data";
import { buzz, useStore } from "@/lib/store";
import { Avatar } from "./status";
import { cn } from "@/lib/utils";

const DEMO_PIN = "1234";

export function SignOn() {
  const { state, dispatch } = useStore();
  const [picked, setPicked] = useState<StaffId | null>(null);
  const [q, setQ] = useState("");
  const last = staffById(state.lastUser);
  const others = STAFF.filter((s) => s.id !== last?.id && s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        {!picked ? (
          <motion.div
            key="who"
            initial={{ opacity: 0, transform: "translateX(-24px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-24px)" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),20px)] pb-6"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hotel className="size-4" /> Demo Hotel · shared phone
            </div>
            <h1 className="mt-3 text-[28px] font-bold tracking-tight">Who&apos;s working?</h1>

            {last && (
              <button
                onClick={() => {
                  buzz();
                  setPicked(last.id);
                }}
                className="press mt-5 flex items-center gap-3 rounded-2xl bg-primary p-4 text-left text-primary-foreground"
              >
                <Avatar staff={last} size={48} />
                <span className="flex-1">
                  <span className="block text-xs font-medium opacity-70">Last on this phone</span>
                  <span className="block text-lg font-semibold">Continue as {last.short}</span>
                </span>
              </button>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find your name"
                className="h-11 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>

            <ul className="mt-2 divide-y">
              {others.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setPicked(s.id)} className="press flex w-full items-center gap-3 py-3 text-left">
                    <Avatar staff={s} size={40} />
                    <span className="flex-1">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted-foreground">{s.roleLabel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-auto pt-6 text-center text-xs text-muted-foreground">
              Demo: try <b>Maya</b> (housekeeper) then <b>Jordan</b> (supervisor). PIN is {DEMO_PIN}.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="pin"
            initial={{ opacity: 0, transform: "translateX(24px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(24px)" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-1 flex-col"
          >
            <PinPad
              staffId={picked}
              onBack={() => setPicked(null)}
              onDone={() => dispatch({ type: "sign-in", user: picked })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PinPad({ staffId, onBack, onDone }: { staffId: StaffId; onBack: () => void; onDone: () => void }) {
  const staff = staffById(staffId)!;
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(0);

  useEffect(() => {
    if (pin.length < 4) return;
    if (pin === DEMO_PIN) {
      buzz(18);
      const t = setTimeout(onDone, 120); // let the 4th dot land before moving on
      return () => clearTimeout(t);
    }
    buzz(60);
    setWrong((w) => w + 1);
    const t = setTimeout(() => setPin(""), 320);
    return () => clearTimeout(t);
  }, [pin, onDone]);

  const press = (d: string) => setPin((p) => (p.length < 4 ? p + d : p));

  return (
    <div className="flex flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <button onClick={onBack} className="press -ml-2 flex size-11 items-center justify-center rounded-full" aria-label="Back">
        <ChevronLeft className="size-6" />
      </button>
      <div className="mt-4 flex flex-col items-center">
        <Avatar staff={staff} size={64} />
        <h2 className="mt-3 text-xl font-semibold">Hi {staff.short}</h2>
        <p className="text-sm text-muted-foreground">Enter your 4-digit PIN</p>
        <div key={wrong} className={cn("mt-6 flex gap-4", wrong > 0 && pin.length === 4 && "shake")}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "size-3.5 rounded-full border-2 border-foreground transition-[background-color,transform] duration-150",
                i < pin.length ? "scale-110 bg-foreground" : "bg-transparent",
              )}
            />
          ))}
        </div>
        <p className={cn("mt-3 h-5 text-sm text-st-dirty transition-opacity", wrong ? "opacity-100" : "opacity-0")}>
          That PIN didn&apos;t match. Try {DEMO_PIN}.
        </p>
      </div>
      <div className="mx-auto mt-auto grid w-full max-w-75 grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onPress={() => press(d)}>
            {d}
          </Key>
        ))}
        <span />
        <Key onPress={() => press("0")}>0</Key>
        <Key onPress={() => setPin((p) => p.slice(0, -1))} label="Delete">
          <Delete className="size-6" />
        </Key>
      </div>
    </div>
  );
}

function Key({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label?: string }) {
  return (
    <button
      aria-label={label}
      // pointer-down so the key responds the instant a finger lands
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPress()}
      className="press flex h-16 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold active:bg-black/10"
    >
      {children}
    </button>
  );
}
