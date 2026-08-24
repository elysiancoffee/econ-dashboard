export interface Period {
  id: string;
  startMonth: number; // 1–12
  startYear: number;
  endMonth: number;   // 1–12
  endYear: number;
}

export interface ScheduleTask {
  id: string;
  name: string;
}

export interface Assignment {
  taskId: string;
  periodId: string;
  usernames: string[];
}

export interface UserColorConfig {
  bg: string;
  text: string;
}

export interface ScheduleData {
  periods: Period[];
  tasks: ScheduleTask[];
  assignments: Assignment[];
  userColors?: Record<string, UserColorConfig>;
}

export interface PublicRosterUser {
  id: string;
  username: string;
  role: string;
}

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
export const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export function isActivePeriod(p: Period): boolean {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const start = y > p.startYear || (y === p.startYear && m >= p.startMonth);
  const end   = y < p.endYear   || (y === p.endYear   && m <= p.endMonth);
  return start && end;
}

export function formatPeriod(p: Period): string {
  const s = MONTHS[p.startMonth - 1];
  const e = MONTHS[p.endMonth - 1];
  if (p.startYear === p.endYear) return `${s}–${e} ${p.startYear}`;
  return `${s} ${p.startYear}–${e} ${p.endYear}`;
}

export const DEFAULT_PALETTES: UserColorConfig[] = [
  { bg: "#2563eb", text: "#ffffff" }, // Royal Blue
  { bg: "#f59e0b", text: "#0a0a0a" }, // Amber
  { bg: "#059669", text: "#ffffff" }, // Emerald
  { bg: "#9333ea", text: "#ffffff" }, // Purple
  { bg: "#ef4444", text: "#ffffff" }, // Red
  { bg: "#06b6d4", text: "#0a0a0a" }, // Cyan
  { bg: "#ec4899", text: "#ffffff" }, // Pink
  { bg: "#f97316", text: "#ffffff" }, // Orange
  { bg: "#0d9488", text: "#ffffff" }, // Teal
  { bg: "#4f46e5", text: "#ffffff" }, // Indigo
  { bg: "#84cc16", text: "#0a0a0a" }, // Lime
  { bg: "#c026d3", text: "#ffffff" }, // Fuchsia
  { bg: "#e11d48", text: "#ffffff" }, // Rose
  { bg: "#64748b", text: "#ffffff" }, // Slate
  { bg: "#b45309", text: "#ffffff" }, // Bronze
  { bg: "#0284c7", text: "#ffffff" }, // Sky Blue
];

export const DEFAULT_SCHEDULE: ScheduleData = {
  periods: [
    { id: "p1", startMonth: 5, startYear: 2025, endMonth: 8,  endYear: 2025 },
    { id: "p2", startMonth: 9, startYear: 2025, endMonth: 12, endYear: 2025 },
    { id: "p3", startMonth: 1, startYear: 2026, endMonth: 4,  endYear: 2026 },
    { id: "p4", startMonth: 5, startYear: 2026, endMonth: 8,  endYear: 2026 },
  ],
  tasks: [
    { id: "t1", name: "Watch Thread" },
    { id: "t2", name: "Item Poll" },
    { id: "t3", name: "Monthly Activity" },
    { id: "t4", name: "CvC Sign-Ups" },
    { id: "t5", name: "PTH Incentive" },
    { id: "t6", name: "Avvie/RB Logging" },
  ],
  assignments: [],
  userColors: {},
};

export const ROLE_ORDER = ["Boss", "Underboss", "Consigliere", "Bagman", "Associate", "Custodian"];

export function normalizeHex(hex: string): string {
  let clean = hex.trim().toLowerCase();
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (clean.length === 4) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
}

export function getUserColor(
  username: string,
  userColors?: Record<string, UserColorConfig>,
  allUsernames: string[] = []
): UserColorConfig {
  if (userColors?.[username]) {
    return userColors[username];
  }
  const idx = allUsernames.indexOf(username);
  const safeIdx = idx >= 0 ? idx : 0;
  return DEFAULT_PALETTES[safeIdx % DEFAULT_PALETTES.length];
}
