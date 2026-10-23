// Fake but realistic data for one shift at "Demo Hotel".
// Times are minutes since midnight on the simulated clock (the demo starts at 9:41).

export type StaffId = "maya" | "priya" | "rosa" | "jordan" | "sam";
export type Role = "housekeeper" | "supervisor" | "maintenance";

export type Staff = {
  id: StaffId;
  name: string;
  short: string;
  role: Role;
  roleLabel: string;
  tint: string; // avatar background
};

export const STAFF: Staff[] = [
  { id: "maya", name: "Maya Chen", short: "Maya", role: "housekeeper", roleLabel: "Housekeeper", tint: "#c9a3c4" },
  { id: "priya", name: "Priya Patel", short: "Priya", role: "housekeeper", roleLabel: "Housekeeper", tint: "#8fa6c4" },
  { id: "rosa", name: "Rosa Alvarez", short: "Rosa", role: "housekeeper", roleLabel: "Housekeeper", tint: "#d39a6a" },
  { id: "jordan", name: "Jordan Blake", short: "Jordan", role: "supervisor", roleLabel: "Supervisor", tint: "#9fbf8f" },
  { id: "sam", name: "Sam Okafor", short: "Sam", role: "maintenance", roleLabel: "Maintenance", tint: "#a3b8a0" },
];

export const staffById = (id: StaffId | null | undefined) => STAFF.find((s) => s.id === id);

/** The four-step life of a room on a housekeeping day. */
export type RoomStatus = "dirty" | "cleaning" | "clean" | "ready";
export type Occupancy = "empty" | "guest";
export type CleanType = "checkout" | "stayover";

export type Room = {
  id: string;
  floor: number;
  bed: string;
  occupancy: Occupancy;
  cleanType: CleanType;
  minutes: number; // planned
  status: RoomStatus;
  assignee: StaffId | null;
  arrival?: number; // next guest arrival (min since midnight)
  rush?: boolean; // front desk flagged early check-in
  note?: string; // from front desk
  startedAt?: number; // real ms timestamp
  finishedAt?: number; // sim minutes
  later?: { reason: IssueKind; until: number }; // can't clean now
  sentBack?: string; // supervisor failed inspection
};

export type IssueKind =
  | "dnd"
  | "declined"
  | "more-time"
  | "ac"
  | "leak"
  | "power"
  | "tv"
  | "damage"
  | "lost"
  | "other";

export type Issue = {
  id: string;
  roomId: string;
  kind: IssueKind;
  by: StaffId;
  at: number; // sim minutes
  status: "open" | "fixed";
  note?: string;
  photo?: string; // data URL
  fixedBy?: StaffId;
};

export type Notice = { id: string; to: StaffId; text: string; seen: boolean };

const t = (h: number, m: number) => h * 60 + m;

export const DEMO_START = t(9, 41);

export const SEED_ROOMS: Room[] = [
  // ---- Maya's board (the demo protagonist) ----
  { id: "102", floor: 1, bed: "Queen", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "ready", assignee: "maya", finishedAt: t(8, 52) },
  { id: "103", floor: 1, bed: "King", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "clean", assignee: "maya", finishedAt: t(9, 34) },
  { id: "104", floor: 1, bed: "2 Queens", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "maya" },
  { id: "105", floor: 1, bed: "King", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "maya", note: "Guest asked for extra towels" },
  { id: "106", floor: 1, bed: "Suite", occupancy: "empty", cleanType: "checkout", minutes: 45, status: "dirty", assignee: "maya" },
  { id: "205", floor: 2, bed: "King", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "dirty", assignee: "maya", arrival: t(11, 0), note: "Anniversary — rose petals on bed" },
  { id: "207", floor: 2, bed: "King", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "dirty", assignee: "maya", arrival: t(10, 30), rush: true },

  // ---- Rest of the hotel ----
  { id: "101", floor: 1, bed: "Queen", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "ready", assignee: "rosa", finishedAt: t(9, 5) },
  { id: "107", floor: 1, bed: "King", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "rosa" },
  { id: "201", floor: 2, bed: "Queen", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "ready", assignee: "priya", finishedAt: t(9, 10) },
  { id: "202", floor: 2, bed: "2 Queens", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "cleaning", assignee: "priya", startedAt: -1 },
  { id: "203", floor: 2, bed: "King", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "clean", assignee: "priya", finishedAt: t(9, 38) },
  { id: "204", floor: 2, bed: "King", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "priya" },
  { id: "206", floor: 2, bed: "Queen", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "priya" },
  { id: "301", floor: 3, bed: "Suite", occupancy: "empty", cleanType: "checkout", minutes: 45, status: "ready", assignee: "rosa", finishedAt: t(8, 40) },
  { id: "302", floor: 3, bed: "King", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "rosa", later: { reason: "dnd", until: t(11, 0) } },
  { id: "303", floor: 3, bed: "Queen", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "rosa" },
  { id: "304", floor: 3, bed: "King", occupancy: "empty", cleanType: "checkout", minutes: 30, status: "dirty", assignee: "rosa", arrival: t(14, 0) },
  { id: "305", floor: 3, bed: "King", occupancy: "guest", cleanType: "stayover", minutes: 15, status: "dirty", assignee: "rosa" },
  { id: "306", floor: 3, bed: "Suite", occupancy: "empty", cleanType: "checkout", minutes: 45, status: "dirty", assignee: "priya", arrival: t(15, 0) },
];

export const SEED_ISSUES: Issue[] = [
  { id: "i-seed-1", roomId: "305", kind: "ac", by: "rosa", at: t(9, 12), status: "open", note: "Guest says the unit only blows room-temperature air." },
  { id: "i-seed-2", roomId: "302", kind: "dnd", by: "rosa", at: t(9, 20), status: "open" },
];
