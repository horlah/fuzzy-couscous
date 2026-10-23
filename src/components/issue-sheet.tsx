"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Camera, Check, Clock4, MessageSquareText, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Issue, IssueKind } from "@/lib/data";
import { ISSUE, fmtTime } from "@/lib/meta";
import { buzz, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAUSE: IssueKind[] = ["dnd", "declined", "more-time"];
const PROBLEM: IssueKind[] = ["ac", "leak", "power", "tv", "damage", "lost", "other"];

/**
 * Report an issue in two taps: open the sheet, tap what's wrong. It's sent on that tap —
 * photo and note are optional extras afterwards, never a gate in front of sending.
 */
export function IssueSheet({ roomId, open, onOpenChange }: { roomId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch, snapshot, report } = useStore();
  const [sent, setSent] = useState<{ issue: Issue; snap: ReturnType<typeof snapshot> } | null>(null);

  useEffect(() => {
    if (open) setSent(null);
  }, [open, roomId]);

  const send = (kind: IssueKind) => {
    if (!roomId) return;
    buzz(16);
    const snap = snapshot();
    const issue = report(roomId, kind);
    setSent({ issue, snap });
  };

  const undo = () => {
    if (!sent) return;
    dispatch({ type: "restore", snap: sent.snap });
    onOpenChange(false);
    toast("Report cancelled", { icon: <Undo2 className="size-4" /> });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-110 pb-[env(safe-area-inset-bottom)]">
        <AnimatePresence mode="popLayout" initial={false}>
          {!sent ? (
            <motion.div
              key="pick"
              initial={{ opacity: 0, transform: "translateX(-16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(-16px)" }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <DrawerHeader className="px-5 pt-5 pb-2 text-left!">
                <DrawerTitle className="text-xl">What&apos;s up with {roomId}?</DrawerTitle>
                <DrawerDescription>Tap one — it sends right away.</DrawerDescription>
              </DrawerHeader>
              <div className="max-h-[65dvh] overflow-y-auto overscroll-contain px-5 pb-8">
                <Group title="Can't clean right now">
                  {PAUSE.map((k) => (
                    <Tile key={k} kind={k} onPick={send} tone="pause" />
                  ))}
                </Group>
                <Group title="Something's wrong in the room">
                  {PROBLEM.map((k) => (
                    <Tile key={k} kind={k} onPick={send} tone="problem" />
                  ))}
                </Group>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, transform: "translateX(16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Sent issue={sent.issue} onUndo={undo} onDone={() => onOpenChange(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-3">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function Tile({ kind, onPick, tone }: { kind: IssueKind; onPick: (k: IssueKind) => void; tone: "pause" | "problem" }) {
  const m = ISSUE[kind];
  const Icon = m.icon;
  return (
    <button
      onClick={() => onPick(kind)}
      className={cn(
        "press flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[13px] leading-tight font-semibold",
        tone === "pause" ? "bg-st-cleaning-bg/60 active:bg-st-cleaning-bg" : "bg-card active:bg-muted",
        kind === "other" && "col-span-3 min-h-14 flex-row py-2",
      )}
    >
      <Icon className={cn(kind === "other" ? "size-5" : "size-7", tone === "pause" ? "text-st-cleaning" : "text-foreground")} strokeWidth={1.75} />
      {m.label}
    </button>
  );
}

function Sent({ issue, onUndo, onDone }: { issue: Issue; onUndo: () => void; onDone: () => void }) {
  const { dispatch, state } = useStore();
  const m = ISSUE[issue.kind];
  const Icon = m.icon;
  const live = state.issues.find((i) => i.id === issue.id) ?? issue;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onPhoto = async (f?: File) => {
    if (!f) return;
    const photo = await shrink(f);
    dispatch({ type: "attach", issueId: issue.id, photo });
    buzz();
  };

  return (
    <div className="px-6 pt-5 pb-8">
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ opacity: 0, transform: "scale(0.6)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.3 }}
          className="flex size-12 items-center justify-center rounded-full bg-st-ready text-white"
        >
          <Check className="size-6" strokeWidth={3} />
        </motion.span>
        <div>
          <p className="text-lg font-semibold">Sent</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Icon className="size-4" /> {m.label} · {issue.roomId} <ArrowRight className="size-3.5" /> {m.routeLabel}
          </p>
        </div>
      </div>

      {m.pauseFor && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-st-cleaning-bg p-3 text-sm">
          <Clock4 className="mt-0.5 size-4 shrink-0 text-st-cleaning" />
          <span>
            Moved to <b>Later</b>.{" "}
            {m.pauseFor < 600 ? <>It comes back to your list at {fmtTime(issue.at + m.pauseFor)}.</> : <>Skipped for today.</>}
          </span>
        </div>
      )}

      <p className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Optional</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" className="press h-12" onClick={() => fileRef.current?.click()}>
          <Camera /> {live.photo ? "Retake" : "Add photo"}
        </Button>
        <Button variant="outline" size="lg" className="press h-12" onClick={() => setNoteOpen((o) => !o)}>
          <MessageSquareText /> {live.note ? "Edit note" : "Add note"}
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />

      {live.photo && (
         
        <motion.img
          initial={{ opacity: 0, transform: "scale(0.96)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          src={live.photo}
          alt="Issue photo"
          className="mt-3 h-28 w-full rounded-xl object-cover"
        />
      )}

      {noteOpen && (
        <div className="mt-3">
          <Textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Water under the sink"
            enterKeyHint="done"
            className="min-h-20"
          />
          <Button
            className="press mt-2 w-full"
            onClick={() => {
              dispatch({ type: "attach", issueId: issue.id, note });
              setNoteOpen(false);
              buzz();
            }}
          >
            Save note
          </Button>
        </div>
      )}
      {!noteOpen && live.note && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">“{live.note}”</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" size="lg" className="press h-12 flex-1" onClick={onUndo}>
          <Undo2 /> Undo
        </Button>
        <Button size="lg" className="press h-12 flex-2 text-base" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

/** Downscale photos so they're cheap to keep and send. */
function shrink(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
