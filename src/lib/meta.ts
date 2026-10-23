import {
  AirVent,
  BedDouble,
  Brush,
  CircleCheck,
  CircleHelp,
  Clock,
  DoorClosed,
  Droplets,
  Hammer,
  Hand,
  type LucideIcon,
  PackageSearch,
  Sparkles,
  Tv,
  User,
  UserX,
  Zap,
  ShieldCheck,
  Timer,
} from "lucide-react";
import type { CleanType, IssueKind, Occupancy, RoomStatus, StaffId } from "./data";

/** Plain-language status: what it means for the person holding the phone. */
export const STATUS: Record<
  RoomStatus,
  { label: string; short: string; icon: LucideIcon; fg: string; bg: string; bar: string; step: number; hint: string }
> = {
  dirty: {
    label: "Needs cleaning",
    short: "Dirty",
    icon: Brush,
    fg: "text-st-dirty",
    bg: "bg-st-dirty-bg",
    bar: "bg-st-dirty",
    step: 0,
    hint: "Not started",
  },
  cleaning: {
    label: "Cleaning now",
    short: "Cleaning",
    icon: Timer,
    fg: "text-st-cleaning",
    bg: "bg-st-cleaning-bg",
    bar: "bg-st-cleaning",
    step: 1,
    hint: "In progress",
  },
  clean: {
    label: "Clean · awaiting check",
    short: "To inspect",
    icon: Sparkles,
    fg: "text-st-clean",
    bg: "bg-st-clean-bg",
    bar: "bg-st-clean",
    step: 2,
    hint: "Supervisor will inspect",
  },
  ready: {
    label: "Ready for guest",
    short: "Ready",
    icon: ShieldCheck,
    fg: "text-st-ready",
    bg: "bg-st-ready-bg",
    bar: "bg-st-ready",
    step: 3,
    hint: "Inspected",
  },
};

export const STEPS: RoomStatus[] = ["dirty", "cleaning", "clean", "ready"];

export const OCCUPANCY: Record<Occupancy, { label: string; icon: LucideIcon }> = {
  empty: { label: "Empty", icon: UserX },
  guest: { label: "Guest staying", icon: User },
};

export const CLEAN_TYPE: Record<CleanType, { label: string; icon: LucideIcon }> = {
  checkout: { label: "Full clean", icon: BedDouble },
  stayover: { label: "Quick tidy", icon: Sparkles },
};

export type IssueMeta = {
  label: string;
  icon: LucideIcon;
  group: "pause" | "problem";
  routeTo: StaffId | "frontdesk";
  routeLabel: string;
  /** Can't clean right now → room moves to "Later" for this many minutes. */
  pauseFor?: number;
};

export const ISSUE: Record<IssueKind, IssueMeta> = {
  dnd: { label: "Do not disturb", icon: DoorClosed, group: "pause", routeTo: "jordan", routeLabel: "Jordan", pauseFor: 60 },
  declined: { label: "Guest said no", icon: Hand, group: "pause", routeTo: "jordan", routeLabel: "Jordan", pauseFor: 24 * 60 },
  "more-time": { label: "Need more time", icon: Clock, group: "pause", routeTo: "jordan", routeLabel: "Jordan" },
  ac: { label: "AC / heat", icon: AirVent, group: "problem", routeTo: "sam", routeLabel: "Sam · Maintenance" },
  leak: { label: "Leak / plumbing", icon: Droplets, group: "problem", routeTo: "sam", routeLabel: "Sam · Maintenance" },
  power: { label: "Lights / power", icon: Zap, group: "problem", routeTo: "sam", routeLabel: "Sam · Maintenance" },
  tv: { label: "TV / Wi‑Fi", icon: Tv, group: "problem", routeTo: "sam", routeLabel: "Sam · Maintenance" },
  damage: { label: "Broken / damaged", icon: Hammer, group: "problem", routeTo: "sam", routeLabel: "Sam · Maintenance" },
  lost: { label: "Lost & found", icon: PackageSearch, group: "problem", routeTo: "frontdesk", routeLabel: "Front desk" },
  other: { label: "Something else", icon: CircleHelp, group: "problem", routeTo: "jordan", routeLabel: "Jordan" },
};

export const DoneIcon = CircleCheck;

export function fmtTime(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function fmtIn(min: number) {
  if (min <= 0) return "now";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export function fmtTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
