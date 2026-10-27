import { readFile } from "@/lib/storage";

// Phục vụ ảnh/tài liệu đã tải lên, bất kể đang lưu trên ổ đĩa server hay S3.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const k = key.map(decodeURIComponent).join("/");
  if (k.includes("..")) return new Response("Không hợp lệ", { status: 400 });
  const file = await readFile(k);
  if (!file) return new Response("Không tìm thấy file", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  // SVG tải lên có thể chứa script: chỉ cho hiển thị như ảnh, chặn chạy mã
  if (file.contentType === "image/svg+xml") headers["Content-Security-Policy"] = "script-src 'none'; sandbox";
  return new Response(new Uint8Array(file.body), { headers });
}
