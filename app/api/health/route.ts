import { getDb, isServerless } from "@/lib/db";

export const dynamic = "force-dynamic";

// Kiểm tra cấu hình sau khi deploy: /api/health
// Chỉ trả về trạng thái có/không, KHÔNG trả về giá trị bí mật.
export async function GET() {
  const env = process.env;
  const problems: string[] = [];
  const serverless = isServerless();

  const config = {
    platform: env.NETLIFY ? "netlify" : env.VERCEL ? "vercel" : "server",
    PUBLIC_BASE_URL: env.PUBLIC_BASE_URL || null,
    DATABASE_URL: env.DATABASE_URL ? "đã khai báo" : "CHƯA khai báo",
    AUTH_SECRET: env.AUTH_SECRET && env.AUTH_SECRET.length >= 32 ? "đã khai báo" : "CHƯA khai báo hoặc ngắn hơn 32 ký tự",
    ADMIN_EMAIL: env.ADMIN_EMAIL ? "đã khai báo" : "CHƯA khai báo",
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ? "đã khai báo" : "CHƯA khai báo",
    STORAGE_DRIVER: env.STORAGE_DRIVER || "local",
    S3: env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? "đã khai báo" : "CHƯA khai báo",
  };
  if (!env.PUBLIC_BASE_URL) problems.push("Thiếu PUBLIC_BASE_URL: mã QR sẽ trỏ về localhost");
  if (!env.DATABASE_URL && serverless) problems.push("Thiếu DATABASE_URL: Vercel/Netlify bắt buộc dùng PostgreSQL bên ngoài (Neon...)");
  if (!(env.AUTH_SECRET && env.AUTH_SECRET.length >= 32)) problems.push("Thiếu AUTH_SECRET (>= 32 ký tự): không đăng nhập được");
  if (serverless && env.STORAGE_DRIVER !== "s3") problems.push("STORAGE_DRIVER phải là s3 trên Vercel/Netlify, nếu không sẽ không tải ảnh lên được");
  if (env.STORAGE_DRIVER === "s3" && config.S3 !== "đã khai báo") problems.push("Thiếu S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY");

  let database = "chưa kiểm tra";
  if (env.DATABASE_URL || !serverless) {
    try {
      const db = await getDb();
      const [r] = await db.query<{ models: number; users: number }>(
        `SELECT (SELECT count(*)::int FROM models) AS models, (SELECT count(*)::int FROM users) AS users`,
      );
      database = `kết nối được: ${r.models} mô hình, ${r.users} người dùng`;
    } catch (e: any) {
      database = "LỖI kết nối";
      problems.push("Không kết nối được CSDL: " + String(e?.message || e).slice(0, 200));
    }
  }

  return Response.json({ ok: problems.length === 0, problems, config, database }, { status: problems.length ? 500 : 200 });
}
