import { createHash } from "node:crypto";
import { one, q } from "./db";

// Xác thực khóa API gửi trong header "Authorization: Bearer <khóa>".
export async function verifyApiKey(req: Request): Promise<{ id: number; name: string } | null> {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const hash = createHash("sha256").update(m[1]).digest("hex");
  const key = await one<{ id: number; name: string }>(`SELECT id, name FROM api_keys WHERE key_hash = $1 AND NOT revoked`, [hash]);
  if (key) await q(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [key.id]);
  return key ?? null;
}

export const apiError = (status: number, message: string) => Response.json({ error: message }, { status });
