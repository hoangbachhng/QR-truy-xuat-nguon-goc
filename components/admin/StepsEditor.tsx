"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import type { ImageItem, Material, ProcessStep } from "@/lib/types";
import { ImagesInput } from "./MediaInput";

type StepDraft = Partial<ProcessStep> & { _k: string; title: string; materials: Material[]; images: ImageItem[] };
const key = () => Math.random().toString(36).slice(2);

// Soạn các bước của quy trình kỹ thuật chuẩn: thuyết minh, vật tư/liều lượng, ảnh và sơ đồ minh họa.
export function StepsEditor({ name, initial }: { name: string; initial: ProcessStep[] }) {
  const [steps, setSteps] = useState<StepDraft[]>(initial.map((s) => ({ ...s, _k: key() })));
  const [open, setOpen] = useState<string | null>(null);
  const [showEn, setShowEn] = useState(false);

  const set = (i: number, p: Partial<StepDraft>) => setSteps((ss) => ss.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const move = (i: number, d: number) =>
    setSteps((ss) => {
      const j = i + d;
      if (j < 0 || j >= ss.length) return ss;
      const n = [...ss];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const addAfter = (i: number, copyFrom?: StepDraft) => {
    const s: StepDraft = copyFrom
      ? { ...copyFrom, id: undefined, _k: key(), title: copyFrom.title + " (bản sao)" }
      : { _k: key(), title: "", stage: steps[i]?.stage ?? "", materials: [], images: [] };
    setSteps((ss) => [...ss.slice(0, i + 1), s, ...ss.slice(i + 1)]);
    setOpen(s._k);
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  const payload = steps.map(({ _k, ...s }) => s);

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
      <label className="mb-3 inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} /> Hiện ô nhập tiếng Anh
      </label>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const isOpen = open === s._k;
          return (
            <div key={s._k} className={`rounded-xl border bg-white ${isOpen ? "border-brand" : "border-line"}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s._k)}>
                  <span className="block truncate font-bold text-earth">{s.title || <i className="font-normal text-stone">Bước chưa đặt tên</i>}</span>
                  <span className="block truncate text-xs text-stone">
                    {[s.stage, s.timing_note, s.images.length ? `${s.images.length} hình` : "", s.materials.length ? `${s.materials.length} vật tư` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                <div className="flex shrink-0 text-stone">
                  <button type="button" className="rounded p-1.5 hover:bg-mist" aria-label="Lên" onClick={() => move(i, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="rounded p-1.5 hover:bg-mist" aria-label="Xuống" onClick={() => move(i, 1)}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="rounded p-1.5 hover:bg-mist" aria-label="Mở" onClick={() => setOpen(isOpen ? null : s._k)}>
                    <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="space-y-3 border-t border-line p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <L label="Tên bước *">
                      <input className="inp" value={s.title} onChange={(e) => set(i, { title: e.target.value })} required />
                    </L>
                    <L label="Giai đoạn" hint="Hiện trên thanh tiến độ, ví dụ: Chuẩn bị, Làm đòng">
                      <input className="inp" value={s.stage ?? ""} onChange={(e) => set(i, { stage: e.target.value })} />
                    </L>
                    {showEn && (
                      <L label="Tên bước (tiếng Anh)">
                        <input className="inp" value={s.title_en ?? ""} onChange={(e) => set(i, { title_en: e.target.value })} />
                      </L>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <L label="Thời điểm (theo tài liệu)" hint="Ví dụ: 8–10 ngày sau sạ; Lúc đòng dài 3–4 mm">
                      <input className="inp" value={s.timing_note ?? ""} onChange={(e) => set(i, { timing_note: e.target.value })} />
                    </L>
                    <L label="Từ ngày thứ" hint="Số ngày sau gieo; âm = trước gieo">
                      <input className="inp" type="number" inputMode="numeric" value={s.day_from ?? ""} onChange={(e) => set(i, { day_from: num(e.target.value) })} />
                    </L>
                    <L label="Đến ngày thứ" hint="Dùng tính ngày dự kiến và tiến độ">
                      <input className="inp" type="number" inputMode="numeric" value={s.day_to ?? ""} onChange={(e) => set(i, { day_to: num(e.target.value) })} />
                    </L>
                    {showEn && (
                      <L label="Thời điểm (tiếng Anh)">
                        <input className="inp" value={s.timing_note_en ?? ""} onChange={(e) => set(i, { timing_note_en: e.target.value })} />
                      </L>
                    )}
                  </div>
                  <L label="Thuyết minh kỹ thuật" hint="Hỗ trợ **in đậm**, gạch đầu dòng bằng dấu - ở đầu dòng">
                    <textarea className="inp font-mono text-sm" rows={7} value={s.content ?? ""} onChange={(e) => set(i, { content: e.target.value })} />
                  </L>
                  {showEn && (
                    <L label="Thuyết minh (tiếng Anh)">
                      <textarea className="inp font-mono text-sm" rows={5} value={s.content_en ?? ""} onChange={(e) => set(i, { content_en: e.target.value })} />
                    </L>
                  )}
                  <div>
                    <span className="lbl">Vật tư, liều lượng</span>
                    <MaterialsEditor value={s.materials} onChange={(m) => set(i, { materials: m })} />
                  </div>
                  <div>
                    <span className="lbl">Hình ảnh, sơ đồ minh họa</span>
                    <ImagesInput folder="process" allowSvg initial={s.images} onChange={(im) => set(i, { images: im })} />
                  </div>
                  <L label="Lưu ý / cảnh báo">
                    <input className="inp" value={s.warning ?? ""} onChange={(e) => set(i, { warning: e.target.value })} />
                  </L>
                  {showEn && (
                    <L label="Lưu ý (tiếng Anh)">
                      <input className="inp" value={s.warning_en ?? ""} onChange={(e) => set(i, { warning_en: e.target.value })} />
                    </L>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    <button type="button" className="btn" onClick={() => addAfter(i)}>
                      <Plus size={15} /> Thêm bước sau bước này
                    </button>
                    <button type="button" className="btn" onClick={() => addAfter(i, s)}>
                      <Copy size={15} /> Nhân bản
                    </button>
                    <button
                      type="button"
                      className="btn-danger ml-auto"
                      onClick={() =>
                        confirm(`Xóa bước "${s.title}"? Nhật ký đã gắn với bước này sẽ chuyển sang "Ghi chép khác".`) &&
                        setSteps((ss) => ss.filter((_, k) => k !== i))
                      }
                    >
                      <Trash2 size={15} /> Xóa bước
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="mt-3 w-full rounded-xl border border-dashed border-stone/50 py-3 text-sm font-bold text-stone hover:border-brand hover:text-brand" onClick={() => addAfter(steps.length - 1)}>
        <Plus size={16} className="mr-1 inline" /> Thêm bước
      </button>
    </div>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

function MaterialsEditor({ value, onChange }: { value: Material[]; onChange: (v: Material[]) => void }) {
  const set = (i: number, p: Partial<Material>) => onChange(value.map((m, k) => (k === i ? { ...m, ...p } : m)));
  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
          <input className="inp" placeholder="Vật tư (Urê, KCl…)" value={m.item} onChange={(e) => set(i, { item: e.target.value })} />
          <input className="inp" placeholder="Liều lượng" value={m.dose} onChange={(e) => set(i, { dose: e.target.value })} />
          <input className="inp col-span-2 sm:col-span-1" placeholder="Ghi chú" value={m.note ?? ""} onChange={(e) => set(i, { note: e.target.value })} />
          <button type="button" aria-label="Xóa dòng" className="row-start-1 col-start-3 self-center p-1 text-red-700 sm:col-start-4" onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => onChange([...value, { item: "", dose: "" }])}>
        <Plus size={15} /> Thêm vật tư
      </button>
    </div>
  );
}
