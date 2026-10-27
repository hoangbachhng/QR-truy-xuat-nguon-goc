import { q } from "./db";

export async function audit(userId: number | null, action: string, entity: string, entityId?: string | number, detail?: unknown) {
  try {
    await q(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5)`, [
      userId,
      action,
      entity,
      entityId == null ? null : String(entityId),
      detail == null ? null : JSON.stringify(detail),
    ]);
  } catch {
    // Ghi lịch sử lỗi không được làm hỏng thao tác chính
  }
}
