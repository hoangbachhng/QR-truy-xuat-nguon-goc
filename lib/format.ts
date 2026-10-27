import type { Model, ProcessStep } from "./types";

const DAY = 86400000;

// Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD (server có thể chạy ở múi giờ khác).
export function todayVN(): string {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

const parse = (d: string) => Date.parse(d + "T00:00:00Z");
export const daysBetween = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY);
export const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY).toISOString().slice(0, 10);

export function fmtDate(d?: string | null) {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function fmtNum(n?: number | null, digits = 2) {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

export interface Progress {
  day: number; // ngày thứ mấy sau gieo
  total: number; // tổng số ngày dự kiến
  percent: number;
  state: "not_started" | "growing" | "harvested" | "closed";
  currentStep?: ProcessStep;
}

export function modelProgress(m: Model, steps: ProcessStep[], growthDays?: number | null): Progress | null {
  if (!m.sow_date) return null;
  const today = todayVN();
  const total = m.harvest_date ? daysBetween(m.sow_date, m.harvest_date) : growthDays || 100;
  const day = daysBetween(m.sow_date, today);
  if (m.status === "harvested" || m.status === "closed")
    return { day: total, total, percent: 100, state: m.status };
  if (day < 0) return { day, total, percent: 0, state: "not_started" };
  const percent = Math.max(0, Math.min(100, Math.round((day / Math.max(total, 1)) * 100)));
  // Bước đang diễn ra: bước có khoảng ngày chứa hôm nay; nếu không có, lấy bước gần nhất đã bắt đầu.
  // Bỏ qua các bước kéo dài cả vụ (chăm sóc, phòng trừ...) để xác định giai đoạn hiện tại;
  // ưu tiên bước có khoảng ngắn nhất, sau đó bước bắt đầu muộn nhất.
  const span = (s: ProcessStep) => (s.day_to ?? s.day_from!) - s.day_from!;
  const allTimed = steps.filter((s) => s.day_from != null);
  const narrow = allTimed.filter((s) => span(s) <= 30);
  const timed = narrow.length ? narrow : allTimed;
  const inRange = timed
    .filter((s) => s.day_from! <= day && (s.day_to ?? s.day_from!) >= day)
    .sort((a, b) => span(a) - span(b) || b.day_from! - a.day_from!);
  const currentStep = inRange[0] ?? timed.filter((s) => s.day_from! <= day).sort((a, b) => b.day_from! - a.day_from!)[0];
  return { day, total, percent, state: "growing", currentStep };
}

// Diễn giải mốc thời gian của bước: "8–10 ngày sau gieo", "1–3 ngày trước gieo"...
export function stepTiming(
  s: Pick<ProcessStep, "day_from" | "day_to">,
  t: { daysAfterSowing: string; beforeSowing: string; sowDate: string },
) {
  const a = s.day_from;
  if (a == null) return "";
  const b = s.day_to ?? a;
  if (a === 0 && b === 0) return t.sowDate;
  if (b < 0) return -b === -a ? `${-a} ${t.beforeSowing}` : `${-b}–${-a} ${t.beforeSowing}`;
  if (a < 0) return `${-a} ${t.beforeSowing} → ${b} ${t.daysAfterSowing}`;
  return a === b ? `${a} ${t.daysAfterSowing}` : `${a}–${b} ${t.daysAfterSowing}`;
}

export function slugCode(s: string) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function phoneDigits(p?: string | null) {
  return (p || "").replace(/[^0-9+]/g, "");
}
