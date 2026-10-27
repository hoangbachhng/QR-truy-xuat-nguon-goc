import { currentUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

const ALLOWED = /^(image\/(jpeg|png|webp|gif|svg\+xml)|application\/pdf)$/;
const FOLDERS = new Set(["process", "diary", "model", "lot", "misc"]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Chưa đăng nhập", { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file");
  const folder = String(fd.get("folder") || "misc");
  if (!(file instanceof File)) return new Response("Thiếu file", { status: 400 });
  if (!ALLOWED.test(file.type)) return new Response("Chỉ nhận ảnh (JPG, PNG, WEBP, SVG) hoặc PDF", { status: 415 });
  if (file.size > MAX_BYTES) return new Response("File quá lớn (tối đa 15 MB)", { status: 413 });
  // Sơ đồ SVG chỉ cho người biên tập trở lên tải lên
  if (file.type === "image/svg+xml" && user.role === "reporter") return new Response("Không được tải SVG", { status: 403 });
  const key = await saveFile(FOLDERS.has(folder) ? folder : "misc", file.name, Buffer.from(await file.arrayBuffer()), file.type);
  return Response.json({ key, name: file.name });
}
