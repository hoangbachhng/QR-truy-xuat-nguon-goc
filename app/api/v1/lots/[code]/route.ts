import { apiError, verifyApiKey } from "@/lib/apikey";
import { one } from "@/lib/db";
import { lotToApi } from "@/lib/lots";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const key = await verifyApiKey(req);
  if (!key) return apiError(401, "Khóa API không hợp lệ hoặc đã bị thu hồi");
  const { code } = await params;
  const lot = await one(`SELECT l.*, v.code AS variety_code FROM lots l LEFT JOIN varieties v ON v.id = l.variety_id WHERE l.code = $1`, [decodeURIComponent(code)]);
  if (!lot) return apiError(404, "Không tìm thấy lô");
  return Response.json(lotToApi(lot));
}
