"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Languages, Plus, Star, Trash2, X } from "lucide-react";
import { FIELD_TYPES, fieldTypeLabel, newFieldId } from "@/lib/fields";
import type { CustomField, FieldType, Testimonial } from "@/lib/types";
import { ImagesInput } from "./MediaInput";

interface Template {
  id: number;
  name: string;
  fields: CustomField[];
}

// Trình tạo trường tùy chỉnh kiểu Google Form.
// mode="values": dùng trong mô hình (định nghĩa trường + nhập giá trị); mode="template": chỉ định nghĩa trường.
export function FieldBuilder({
  name,
  initial,
  templates = [],
  mode = "values",
}: {
  name: string;
  initial: CustomField[];
  templates?: Template[];
  mode?: "values" | "template";
}) {
  const [fields, setFields] = useState<CustomField[]>(initial);
  const [adding, setAdding] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const withValues = mode === "values";

  const set = (i: number, patch: Partial<CustomField>) => setFields((fs) => fs.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) =>
    setFields((fs) => {
      const j = i + d;
      if (j < 0 || j >= fs.length) return fs;
      const n = [...fs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const add = (type: FieldType) => {
    setFields((fs) => [
      ...fs,
      { id: newFieldId(), type, label: type === "testimonials" ? "Nhận xét của chủ ruộng" : "", options: type === "select" ? ["Tốt", "Khá", "Trung bình"] : undefined },
    ]);
    setAdding(false);
  };
  const applyTemplate = (id: string) => {
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setFields((fs) => {
      const have = new Set(fs.map((f) => f.label.trim().toLowerCase()));
      const extra = t.fields.filter((f) => !have.has(f.label.trim().toLowerCase())).map((f) => ({ ...f, id: newFieldId(), value: undefined }));
      return [...fs, ...extra];
    });
  };

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(fields)} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {templates.length > 0 && (
          <select className="inp w-auto" defaultValue="" onChange={(e) => (applyTemplate(e.target.value), (e.target.value = ""))}>
            <option value="" disabled>
              Thêm trường từ mẫu…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <button type="button" className={showEn ? "btn border-brand text-brand" : "btn"} onClick={() => setShowEn((v) => !v)}>
          <Languages size={15} /> Tiếng Anh
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-mist/50 px-3 py-2">
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-stone">{fieldTypeLabel(f.type)}</span>
              <input
                className="min-w-40 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-bold text-earth hover:border-line focus:border-brand focus:bg-white focus:outline-none"
                placeholder="Tên trường, ví dụ: Khả năng chống đổ"
                value={f.label}
                onChange={(e) => set(i, { label: e.target.value })}
                required
              />
              <div className="ml-auto flex text-stone">
                <IconBtn label="Lên" onClick={() => move(i, -1)}>
                  <ArrowUp size={15} />
                </IconBtn>
                <IconBtn label="Xuống" onClick={() => move(i, 1)}>
                  <ArrowDown size={15} />
                </IconBtn>
                <IconBtn label="Xóa trường" danger onClick={() => confirm(`Xóa trường "${f.label || "chưa đặt tên"}"?`) && setFields((fs) => fs.filter((_, k) => k !== i))}>
                  <Trash2 size={15} />
                </IconBtn>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {showEn && (
                <input className="inp text-sm" placeholder="Tên trường bằng tiếng Anh" value={f.label_en || ""} onChange={(e) => set(i, { label_en: e.target.value })} />
              )}
              {f.type === "number" && (
                <input className="inp w-40 text-sm" placeholder="Đơn vị (cm, kg/ha…)" value={f.unit || ""} onChange={(e) => set(i, { unit: e.target.value })} />
              )}
              {f.type === "select" && (
                <textarea
                  className="inp text-sm"
                  rows={2}
                  placeholder="Mỗi dòng một lựa chọn"
                  value={(f.options || []).join("\n")}
                  onChange={(e) => set(i, { options: e.target.value.split("\n") })}
                />
              )}
              {withValues && <ValueEditor f={f} onChange={(patch) => set(i, patch)} showEn={showEn} />}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-brand/40 bg-brand/5 p-3">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-brand">
            Chọn kiểu trường
            <button type="button" aria-label="Đóng" onClick={() => setAdding(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FIELD_TYPES.map((t) => (
              <button key={t.type} type="button" className="btn justify-start" onClick={() => add(t.type)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" className="mt-3 w-full rounded-xl border border-dashed border-stone/50 py-3 text-sm font-bold text-stone hover:border-brand hover:text-brand" onClick={() => setAdding(true)}>
          <Plus size={16} className="mr-1 inline" /> Thêm trường
        </button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`rounded p-1.5 ${danger ? "text-red-700 hover:bg-red-50" : "hover:bg-white"}`}>
      {children}
    </button>
  );
}

function ValueEditor({ f, onChange, showEn }: { f: CustomField; onChange: (p: Partial<CustomField>) => void; showEn: boolean }) {
  switch (f.type) {
    case "text":
      return (
        <>
          <input className="inp" placeholder="Giá trị" value={f.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />
          {showEn && <input className="inp text-sm" placeholder="Giá trị tiếng Anh" value={f.value_en ?? ""} onChange={(e) => onChange({ value_en: e.target.value })} />}
        </>
      );
    case "textarea":
      return (
        <>
          <textarea className="inp" rows={3} placeholder="Nội dung" value={f.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />
          {showEn && <textarea className="inp text-sm" rows={2} placeholder="Nội dung tiếng Anh" value={f.value_en ?? ""} onChange={(e) => onChange({ value_en: e.target.value })} />}
        </>
      );
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input className="inp w-40" type="number" step="any" inputMode="decimal" value={f.value ?? ""} onChange={(e) => onChange({ value: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <span className="text-sm text-stone">{f.unit}</span>
        </div>
      );
    case "date":
      return <input className="inp w-48" type="date" value={f.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />;
    case "select":
      return (
        <select className="inp w-auto min-w-48" value={f.value ?? ""} onChange={(e) => onChange({ value: e.target.value })}>
          <option value="">— Chọn —</option>
          {(f.options || []).filter(Boolean).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case "image":
      return (
        <ImagesInput
          folder="model"
          initial={f.value?.key ? [f.value] : []}
          onChange={(items) => onChange({ value: items[items.length - 1] })}
        />
      );
    case "testimonials":
      return <TestimonialsEditor value={Array.isArray(f.value) ? f.value : []} onChange={(v) => onChange({ value: v })} showEn={showEn} />;
  }
}

function TestimonialsEditor({ value, onChange, showEn }: { value: Testimonial[]; onChange: (v: Testimonial[]) => void; showEn: boolean }) {
  const set = (i: number, p: Partial<Testimonial>) => onChange(value.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      {value.map((t, i) => (
        <div key={i} className="rounded-lg border border-line bg-mist/40 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="inp" placeholder="Họ tên chủ ruộng" value={t.name} onChange={(e) => set(i, { name: e.target.value })} />
            <input className="inp" placeholder="Địa phương" value={t.place || ""} onChange={(e) => set(i, { place: e.target.value })} />
            <input className="inp" placeholder="Vụ đã làm, ví dụ Hè Thu 2026" value={t.season || ""} onChange={(e) => set(i, { season: e.target.value })} />
          </div>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} sao`} onClick={() => set(i, { rating: n })} className="text-gold">
                <Star size={20} fill={(t.rating || 0) >= n ? "currentColor" : "none"} />
              </button>
            ))}
            <button type="button" className="ml-auto text-sm text-red-700" onClick={() => onChange(value.filter((_, k) => k !== i))}>
              Xóa nhận xét
            </button>
          </div>
          <textarea className="inp mt-2" rows={2} placeholder="Nội dung nhận xét" value={t.content} onChange={(e) => set(i, { content: e.target.value })} />
          {showEn && <textarea className="inp mt-2 text-sm" rows={2} placeholder="Nội dung tiếng Anh" value={t.content_en || ""} onChange={(e) => set(i, { content_en: e.target.value })} />}
          <div className="mt-2">
            <ImagesInput folder="model" captions={false} initial={t.image ? [{ key: t.image }] : []} onChange={(items) => set(i, { image: items[items.length - 1]?.key })} />
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => onChange([...value, { name: "", content: "", rating: 5 }])}>
        <Plus size={15} /> Thêm nhận xét
      </button>
    </div>
  );
}
