// Đọc dữ liệu từ FormData an toàn
export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
export const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
export const date = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export function json<T>(fd: FormData, k: string, fallback: T): T {
  try {
    const v = fd.get(k);
    return typeof v === "string" && v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
