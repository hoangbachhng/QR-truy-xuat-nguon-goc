import { q, one } from "./db";
import type { DiaryEntry, Lot, Model, Process, ProcessStep, User, Variety } from "./types";

// ---------- Giống ----------
export const listVarieties = () => q<Variety>(`SELECT * FROM varieties ORDER BY crop, code`);
export const getVariety = (id: number) => one<Variety>(`SELECT * FROM varieties WHERE id = $1`, [id]);

// ---------- Quy trình ----------
export const listProcesses = () =>
  q<Process & { variety_code: string; variety_name: string; step_count: number; model_count: number }>(
    `SELECT p.*, v.code AS variety_code, v.name AS variety_name,
       (SELECT count(*)::int FROM process_steps s WHERE s.process_id = p.id) AS step_count,
       (SELECT count(*)::int FROM models m WHERE m.process_id = p.id) AS model_count
     FROM processes p JOIN varieties v ON v.id = p.variety_id
     ORDER BY v.code, p.region, p.version DESC`,
  );
export const getProcess = (id: number) => one<Process>(`SELECT * FROM processes WHERE id = $1`, [id]);
export const getSteps = (processId: number) =>
  q<ProcessStep>(`SELECT * FROM process_steps WHERE process_id = $1 ORDER BY position, id`, [processId]);

// ---------- Lô giống ----------
export const listLots = () =>
  q<Lot & { variety_code: string | null }>(
    `SELECT l.*, v.code AS variety_code FROM lots l LEFT JOIN varieties v ON v.id = l.variety_id ORDER BY l.updated_at DESC`,
  );
export const getLotByCode = (code: string) => one<Lot>(`SELECT * FROM lots WHERE code = $1`, [code]);
export const getLot = (id: number) => one<Lot>(`SELECT * FROM lots WHERE id = $1`, [id]);

// Lần ngược hành trình lô: lô hiện tại -> lô mẹ -> ... (tối đa 6 cấp)
export async function lotLineage(code: string): Promise<Lot[]> {
  const chain: Lot[] = [];
  let current = await getLotByCode(code);
  const seen = new Set<string>();
  while (current && chain.length < 6 && !seen.has(current.code)) {
    chain.push(current);
    seen.add(current.code);
    current = current.parent_code ? await getLotByCode(current.parent_code) : undefined;
  }
  return chain.reverse();
}

// ---------- Mô hình ----------
export interface ModelListItem extends Model {
  variety_code: string;
  variety_name: string;
  crop: string;
  diary_count: number;
  scan_count: number;
  last_diary: string | null;
}

export async function listModels(filter: {
  q?: string;
  year?: number;
  crop?: string;
  status?: string;
  assignedTo?: number;
  publishedOnly?: boolean;
}) {
  const where: string[] = [];
  const params: unknown[] = [];
  // `?` trong câu điều kiện được thay bằng tham số $n vừa thêm (dùng lại được nhiều lần)
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replaceAll("?", `$${params.length}`));
  };
  if (filter.q)
    add(`(m.code ILIKE ? OR v.code ILIKE ? OR m.province ILIKE ? OR m.farmer_name ILIKE ? OR v.name ILIKE ?)`, `%${filter.q}%`);
  if (filter.year) add(`m.year = ?`, filter.year);
  if (filter.crop) add(`v.crop = ?`, filter.crop);
  if (filter.status) add(`m.status = ?`, filter.status);
  if (filter.assignedTo) add(`EXISTS (SELECT 1 FROM model_assignees a WHERE a.model_id = m.id AND a.user_id = ?)`, filter.assignedTo);
  if (filter.publishedOnly) where.push(`m.published`);
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  return q<ModelListItem>(
    `SELECT m.*, v.code AS variety_code, v.name AS variety_name, v.crop,
       (SELECT count(*)::int FROM diary_entries d WHERE d.model_id = m.id) AS diary_count,
       (SELECT count(*)::int FROM scans s WHERE s.model_id = m.id) AS scan_count,
       (SELECT max(entry_date)::text FROM diary_entries d WHERE d.model_id = m.id) AS last_diary
     FROM models m JOIN varieties v ON v.id = m.variety_id
     ${whereSql}
     ORDER BY m.year DESC NULLS LAST, m.code DESC`,
    params,
  );
}

export const getModel = (id: number) => one<Model>(`SELECT * FROM models WHERE id = $1`, [id]);
export const getModelByCode = (code: string) => one<Model>(`SELECT * FROM models WHERE upper(code) = upper($1)`, [code]);

export const modelAssignees = (modelId: number) =>
  q<{ user_id: number }>(`SELECT user_id FROM model_assignees WHERE model_id = $1`, [modelId]).then((r) =>
    r.map((x) => x.user_id),
  );

export async function isAssigned(modelId: number, userId: number) {
  return !!(await one(`SELECT 1 FROM model_assignees WHERE model_id = $1 AND user_id = $2`, [modelId, userId]));
}

export async function nextModelCode(year: number) {
  const r = await one<{ n: number }>(
    `SELECT coalesce(max(substring(code from '^MH-${year}-(\\d+)$')::int), 0) AS n FROM models WHERE code ~ '^MH-${year}-\\d+$'`,
  );
  return `MH-${year}-${String((r?.n || 0) + 1).padStart(3, "0")}`;
}

// ---------- Nhật ký ----------
export const listDiary = (modelId: number, approvedOnly = false) =>
  q<DiaryEntry>(
    `SELECT d.*, u.name AS author_name FROM diary_entries d LEFT JOIN users u ON u.id = d.author_id
     WHERE d.model_id = $1 ${approvedOnly ? "AND d.approved" : ""}
     ORDER BY d.entry_date, d.id`,
    [modelId],
  );

export const recentDiary = (opts: { limit?: number; pendingOnly?: boolean; authorId?: number } = {}) =>
  q<DiaryEntry & { model_code: string; step_title: string | null }>(
    `SELECT d.*, u.name AS author_name, m.code AS model_code, s.title AS step_title
     FROM diary_entries d
     JOIN models m ON m.id = d.model_id
     LEFT JOIN users u ON u.id = d.author_id
     LEFT JOIN process_steps s ON s.id = d.step_id
     WHERE ($1::boolean IS NOT TRUE OR NOT d.approved) AND ($2::int IS NULL OR d.author_id = $2)
     ORDER BY d.created_at DESC LIMIT $3`,
    [opts.pendingOnly ?? false, opts.authorId ?? null, opts.limit ?? 30],
  );

// ---------- Người dùng, cài đặt ----------
export const listUsers = () => q<User & { created_at: string }>(`SELECT id, email, name, phone, role, active, created_at FROM users ORDER BY role, name`);

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await one<{ value: T }>(`SELECT value FROM settings WHERE key = $1`, [key]);
  return r ? r.value : fallback;
}
export const setSetting = (key: string, value: unknown) =>
  q(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [
    key,
    JSON.stringify(value),
  ]);

export const listTemplates = () => q<{ id: number; name: string; crop: string | null; fields: any[] }>(`SELECT * FROM field_templates ORDER BY id`);
