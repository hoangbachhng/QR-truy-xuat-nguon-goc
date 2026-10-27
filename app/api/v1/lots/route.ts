import { apiError, verifyApiKey } from "@/lib/apikey";
import { audit } from "@/lib/audit";
import { q } from "@/lib/db";
import { lotToApi, normalizeLot, upsertLots, type LotInput } from "@/lib/lots";

// API cho phần mềm kho (giai đoạn 2). Tài liệu: docs/api-lo-giong.md
//  POST /api/v1/lots   body: một lô {...} hoặc { "lots": [ {...}, ... ] } (tối đa 500 lô/lần) -> tạo mới hoặc cập nhật theo mã lô
//  GET  /api/v1/lots?updated_since=2026-01-01  -> danh sách lô (tối đa 500)

export async function POST(req: Request) {
  const key = await verifyApiKey(req);
  if (!key) return apiError(401, "Khóa API không hợp lệ hoặc đã bị thu hồi");
  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body phải là JSON");
  }
  const raw: unknown[] = Array.isArray(body?.lots) ? body.lots : Array.isArray(body) ? body : [body];
  if (raw.length > 500) return apiError(413, "Tối đa 500 lô mỗi lần gửi");
  const lots: LotInput[] = [];
  const invalid: { index: number; error: string }[] = [];
  raw.forEach((r, i) => {
    const lot = r && typeof r === "object" ? normalizeLot(r as Record<string, unknown>) : null;
    if (lot) lots.push(lot);
    else invalid.push({ index: i, error: "Thiếu mã lô (code)" });
  });
  const res = await upsertLots(lots, "wms");
  await audit(null, "api_upsert", "lot", undefined, { key: key.name, created: res.created, updated: res.updated, errors: res.errors.length + invalid.length });
  const status = res.errors.length || invalid.length ? 207 : 200;
  return Response.json({ created: res.created, updated: res.updated, errors: [...invalid, ...res.errors] }, { status });
}

export async function GET(req: Request) {
  const key = await verifyApiKey(req);
  if (!key) return apiError(401, "Khóa API không hợp lệ hoặc đã bị thu hồi");
  const since = new URL(req.url).searchParams.get("updated_since");
  const rows = await q(
    `SELECT l.*, v.code AS variety_code FROM lots l LEFT JOIN varieties v ON v.id = l.variety_id
     WHERE ($1::timestamptz IS NULL OR l.updated_at >= $1::timestamptz) ORDER BY l.updated_at DESC LIMIT 500`,
    [since && !Number.isNaN(Date.parse(since)) ? since : null],
  );
  return Response.json({ lots: rows.map(lotToApi) });
}
