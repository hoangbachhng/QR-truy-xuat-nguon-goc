"use client";

import { useRef, useState } from "react";
import { Camera, FileText, ImagePlus, Loader2, Trash2, ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { uploadFile } from "@/lib/upload-client";
import type { ImageItem } from "@/lib/types";

const url = (key: string) => `/files/${key}`;

// Danh sách ảnh/sơ đồ có chú thích. Giá trị gửi lên form: JSON trong input ẩn `name`.
export function ImagesInput({
  name,
  initial = [],
  folder,
  captions = true,
  camera = false,
  allowSvg = false,
  onChange,
}: {
  name?: string;
  initial?: ImageItem[];
  folder: string;
  captions?: boolean;
  camera?: boolean;
  allowSvg?: boolean;
  onChange?: (v: ImageItem[]) => void;
}) {
  const [items, setItems] = useState<ImageItem[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const update = (next: ImageItem[]) => {
    setItems(next);
    onChange?.(next);
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy((b) => b + files.length);
    const added: ImageItem[] = [];
    for (const f of Array.from(files)) {
      try {
        const r = await uploadFile(f, folder);
        added.push({ key: r.key, caption: "" });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    setItems((cur) => {
      const next = [...cur, ...added];
      onChange?.(next);
      return next;
    });
  }

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div>
      {name && <input type="hidden" name={name} value={JSON.stringify(items)} />}
      {items.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((im, i) => (
            <div key={im.key} className="overflow-hidden rounded-lg border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url(im.key)} alt="" className="aspect-[4/3] w-full bg-mist object-contain" />
              {captions && (
                <input
                  className="w-full border-t border-line px-2 py-1 text-xs focus:outline-none"
                  placeholder="Chú thích ảnh"
                  value={im.caption || ""}
                  onChange={(e) => update(items.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
                />
              )}
              <div className="flex border-t border-line text-stone">
                <button type="button" aria-label="Lên trước" className="flex-1 py-1 hover:bg-mist" onClick={() => move(i, -1)}>
                  <ArrowLeft size={14} className="mx-auto" />
                </button>
                <button type="button" aria-label="Xuống sau" className="flex-1 py-1 hover:bg-mist" onClick={() => move(i, 1)}>
                  <ArrowRight size={14} className="mx-auto" />
                </button>
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  className="flex-1 py-1 text-red-700 hover:bg-red-50"
                  onClick={() => update(items.filter((_, k) => k !== i))}
                >
                  <Trash2 size={14} className="mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {camera && (
          <button type="button" className="btn-primary" onClick={() => camRef.current?.click()}>
            <Camera size={16} /> Chụp ảnh
          </button>
        )}
        <button type="button" className="btn" onClick={() => pickRef.current?.click()}>
          <ImagePlus size={16} /> {camera ? "Chọn từ máy" : "Thêm ảnh / sơ đồ"}
        </button>
        {busy > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-stone">
            <Loader2 size={14} className="animate-spin" /> Đang tải {busy} ảnh…
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <input
        ref={pickRef}
        type="file"
        hidden
        multiple
        accept={allowSvg ? "image/*,.svg" : "image/jpeg,image/png,image/webp"}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camRef}
        type="file"
        hidden
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// Một file đơn (PDF phiếu kiểm nghiệm, tài liệu quy trình gốc...). Gửi 2 input ẩn: `${name}` (key) và `${name}_name`.
export function FileInput({
  name,
  initial,
  folder,
  accept = "application/pdf,image/*",
  label = "Tải file lên",
  disabled,
}: {
  name: string;
  initial?: { key: string | null; name: string | null };
  folder: string;
  accept?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [file, setFile] = useState(initial?.key ? { key: initial.key, name: initial.name || "Tệp đính kèm" } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input type="hidden" name={name} value={file?.key || ""} />
      <input type="hidden" name={`${name}_name`} value={file?.name || ""} />
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-mist/60 px-3 py-2 text-sm">
          <FileText size={16} className="text-brand" />
          <a href={url(file.key)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-brand underline">
            {file.name}
          </a>
          {!disabled && (
            <button type="button" className="text-red-700" aria-label="Gỡ file" onClick={() => setFile(null)}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="btn" disabled={disabled || busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {label}
        </button>
      )}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            setFile(await uploadFile(f, folder));
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
