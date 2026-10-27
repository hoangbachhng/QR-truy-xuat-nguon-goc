// Tải file lên từ trình duyệt. Ảnh được thu nhỏ (tối đa 1600px, JPEG) ngay trên điện thoại trước khi gửi
// để tiết kiệm dung lượng mạng ngoài đồng và nằm trong giới hạn kích thước của Vercel/Netlify.

const MAX_SIDE = 1600;

async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadFile(file: File, folder: string): Promise<{ key: string; name: string }> {
  const f = await shrinkImage(file);
  const fd = new FormData();
  fd.append("file", f);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.text()) || "Tải file thất bại");
  return res.json();
}
