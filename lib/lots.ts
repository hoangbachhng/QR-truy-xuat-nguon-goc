import { q, one } from "./db";

// Dùng chung cho: nhập Excel (giai đoạn 1) và API phần mềm kho (giai đoạn 2).
// Mọi nguồn đều đổ về cùng bảng `lots`, phân biệt bằng cột `source`.

export interface LotInput {
  code: string;
  variety_code?: string | null;
  seed_class?: string | null;
  production_date?: string | null;
  producer?: string | null;
  quantity_kg?: number | null;
  germination?: number | null;
  purity?: number | null;
  moisture?: number | null;
  test_date?: string | null;
  parent_code?: string | null;
  notes?: string | null;
  external_id?: string | null;
  extra?: Record<string, unknown>;
}

// Cột của file Excel mẫu (thứ tự = thứ tự cột)
export const LOT_COLUMNS: { key: keyof LotInput; header: string; width: number }[] = [
  { key: "code", header: "Mã lô (*)", width: 22 },
  { key: "variety_code", header: "Mã giống", width: 12 },
  { key: "seed_class", header: "Cấp giống", width: 18 },
  { key: "production_date", header: "Ngày sản xuất (dd/mm/yyyy)", width: 16 },
  { key: "producer", header: "Cơ sở sản xuất", width: 26 },
  { key: "quantity_kg", header: "Số lượng (kg)", width: 14 },
  { key: "germination", header: "Tỷ lệ nảy mầm (%)", width: 14 },
  { key: "purity", header: "Độ sạch (%)", width: 12 },
  { key: "moisture", header: "Độ ẩm (%)", width: 12 },
  { key: "test_date", header: "Ngày kiểm nghiệm (dd/mm/yyyy)", width: 16 },
  { key: "parent_code", header: "Mã lô mẹ", width: 22 },
  { key: "notes", header: "Ghi chú", width: 30 },
];

const NUMERIC = new Set(["quantity_kg", "germination", "purity", "moisture"]);
const DATES = new Set(["production_date", "test_date"]);

export function normDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function normNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function normalizeLot(raw: Record<string, unknown>): LotInput | null {
  const code = String(raw.code ?? "").trim();
  if (!code) return null;
  const out: Record<string, unknown> = { code };
  for (const { key } of LOT_COLUMNS) {
    if (key === "code") continue;
    const v = raw[key];
    if (NUMERIC.has(key)) out[key] = normNum(v);
    else if (DATES.has(key)) out[key] = normDate(v);
    else out[key] = v == null || v === "" ? null : String(v).trim();
  }
  if (raw.external_id != null) out.external_id = String(raw.external_id);
  if (raw.extra && typeof raw.extra === "object") out.extra = raw.extra;
  return out as unknown as LotInput;
}

export async function parseLotWorkbook(buf: Buffer): Promise<LotInput[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File không có trang tính");
  const rows: LotInput[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return; // dòng tiêu đề
    const raw: Record<string, unknown> = {};
    LOT_COLUMNS.forEach((c, k) => {
      const cell = row.getCell(k + 1).value as any;
      raw[c.key] = cell && typeof cell === "object" && !(cell instanceof Date) ? (cell.result ?? cell.text ?? "") : cell;
    });
    const lot = normalizeLot(raw);
    if (lot) rows.push(lot);
  });
  return rows;
}

export async function upsertLots(rows: LotInput[], source: "manual" | "wms") {
  let created = 0;
  let updated = 0;
  const errors: { code: string; error: string }[] = [];
  const varietyIds = new Map<string, number | null>();
  for (const r of rows) {
    try {
      let variety_id: number | null = null;
      if (r.variety_code) {
        const vc = r.variety_code.toUpperCase();
        if (!varietyIds.has(vc)) varietyIds.set(vc, (await one<{ id: number }>(`SELECT id FROM varieties WHERE upper(code) = $1`, [vc]))?.id ?? null);
        variety_id = varietyIds.get(vc)!;
      }
      const existing = await one<{ id: number; source: string }>(`SELECT id, source FROM lots WHERE code = $1`, [r.code]);
      // Nhập tay không được ghi đè lô đã đồng bộ từ phần mềm kho
      if (existing && existing.source === "wms" && source === "manual") {
        errors.push({ code: r.code, error: "Lô đã đồng bộ từ phần mềm kho, không ghi đè bằng nhập tay" });
        continue;
      }
      const vals = [
        r.code,
        variety_id,
        r.seed_class ?? null,
        r.production_date ?? null,
        r.producer ?? null,
        r.quantity_kg ?? null,
        r.germination ?? null,
        r.purity ?? null,
        r.moisture ?? null,
        r.test_date ?? null,
        r.parent_code ?? null,
        r.notes ?? null,
        source,
        r.external_id ?? null,
        JSON.stringify(r.extra ?? {}),
      ];
      if (existing) {
        await q(
          `UPDATE lots SET code=$1, variety_id=coalesce($2, variety_id), seed_class=$3, production_date=$4, producer=$5, quantity_kg=$6, germination=$7,
           purity=$8, moisture=$9, test_date=$10, parent_code=$11, notes=coalesce($12, notes), source=$13, external_id=$14, extra=$15,
           synced_at = CASE WHEN $13 = 'wms' THEN now() ELSE synced_at END, updated_at=now() WHERE id=$16`,
          [...vals, existing.id],
        );
        updated++;
      } else {
        await q(
          `INSERT INTO lots (code, variety_id, seed_class, production_date, producer, quantity_kg, germination, purity, moisture, test_date, parent_code, notes, source, external_id, extra, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CASE WHEN $13 = 'wms' THEN now() END)`,
          vals,
        );
        created++;
      }
    } catch (e: any) {
      errors.push({ code: r.code, error: e.message });
    }
  }
  return { created, updated, errors };
}

// Dữ liệu lô trả ra qua API (không lộ thông tin nội bộ như ghi chú)
export function lotToApi(l: any) {
  return {
    code: l.code,
    variety_code: l.variety_code ?? null,
    seed_class: l.seed_class,
    production_date: l.production_date,
    producer: l.producer,
    quantity_kg: l.quantity_kg,
    germination: l.germination,
    purity: l.purity,
    moisture: l.moisture,
    test_date: l.test_date,
    parent_code: l.parent_code,
    source: l.source,
    external_id: l.external_id,
    synced_at: l.synced_at,
  };
}
