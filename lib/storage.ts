import { randomUUID } from "node:crypto";

// Lưu file trung lập: STORAGE_DRIVER=local (ổ đĩa server) hoặc s3 (R2, AWS S3, MinIO...).
// Mọi file được phục vụ qua đường dẫn /files/<key> của chính website, nên đổi nơi lưu không đổi URL.

export interface StoredFile {
  body: Buffer;
  contentType: string;
}

interface Driver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  remove(key: string): Promise<void>;
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const mimeOf = (key: string) => MIME[key.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";

function localDriver(): Driver {
  const root = process.env.UPLOAD_DIR || "./data/uploads";
  const resolve = async (key: string) => {
    const path = await import("node:path");
    const base = path.resolve(root);
    const full = path.resolve(base, key);
    if (!full.startsWith(base + path.sep)) throw new Error("Đường dẫn file không hợp lệ");
    return full;
  };
  return {
    async put(key, body) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const full = await resolve(key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, body);
    },
    async get(key) {
      const fs = await import("node:fs/promises");
      try {
        return { body: await fs.readFile(await resolve(key)), contentType: mimeOf(key) };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const fs = await import("node:fs/promises");
      await fs.rm(await resolve(key), { force: true });
    },
  };
}

function s3Driver(): Driver {
  const bucket = process.env.S3_BUCKET!;
  const clientP = import("@aws-sdk/client-s3").then(
    ({ S3Client }) =>
      new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      }),
  );
  return {
    async put(key, body, contentType) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await (await clientP).send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      try {
        const r = await (await clientP).send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await r.Body!.transformToByteArray();
        return { body: Buffer.from(bytes), contentType: r.ContentType || mimeOf(key) };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await (await clientP).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

let driver: Driver | undefined;
function storage(): Driver {
  if (!driver) driver = process.env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver();
  return driver;
}

export async function saveFile(folder: string, filename: string, body: Buffer, contentType?: string) {
  const ext = (filename.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const now = new Date();
  const key = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
  await storage().put(key, body, contentType || mimeOf(key));
  return key;
}

export const readFile = (key: string) => storage().get(key);
export const deleteFile = (key: string) => storage().remove(key);
export const fileUrl = (key?: string | null) => (key ? `/files/${key}` : "");
