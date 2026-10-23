"use client";

import { useEffect } from "react";
import { BellRing, LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { type StaffId, staffById } from "@/lib/data";
import { fmtTime } from "@/lib/meta";
import { useStore } from "@/lib/store";
import { Avatar } from "./status";

export function TopBar({ me: meId, title, subtitle }: { me: StaffId; title: string; subtitle?: React.ReactNode }) {
  const { now, dispatch } = useStore();
  const me = staffById(meId)!;
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Avatar staff={me} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {me.short} · <span className="tabular">{fmtTime(now)}</span>
          </p>
          <h1 className="text-xl leading-tight font-bold">{title}</h1>
        </div>
        <button
          onClick={() => {
            if (confirmReset()) dispatch({ type: "reset" });
          }}
          className="press flex size-10 items-center justify-center rounded-full text-muted-foreground"
          aria-label="Reset demo data"
          title="Reset demo"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          onClick={() => dispatch({ type: "sign-out" })}
          className="press flex h-10 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-semibold"
          aria-label="Switch person"
        >
          <LogOut className="size-4" /> Switch
        </button>
      </div>
      {subtitle && <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>}
    </header>
  );
}

function confirmReset() {
  // window.confirm is fine for a demo-only control that a real user never sees
  return typeof window !== "undefined" && window.confirm("Reset the demo to the start of the shift?");
}

/** Show anything addressed to this person since they last looked, then mark it seen. */
export function useNotices(me: StaffId) {
  const { state, dispatch } = useStore();
  const unseen = state.notices.filter((n) => n.to === me && !n.seen);
  const key = unseen.map((n) => n.id).join(",");
  useEffect(() => {
    if (!unseen.length) return;
    const t = setTimeout(() => {
      unseen.forEach((n, i) => setTimeout(() => toast(n.text, { icon: <BellRing className="size-4" />, duration: 6000 }), i * 250));
      dispatch({ type: "seen", ids: unseen.map((n) => n.id) });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
