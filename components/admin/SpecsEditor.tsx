"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Spec } from "@/lib/types";

// Bảng chỉ tiêu của giống (tên chỉ tiêu – giá trị), có cột tiếng Anh tùy chọn.
export function SpecsEditor({ name, initial }: { name: string; initial: Spec[] }) {
  const [rows, setRows] = useState<Spec[]>(initial);
  const set = (i: number, p: Partial<Spec>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.label.trim()))} />
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input className="inp" placeholder="Chỉ tiêu" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
          <input className="inp" placeholder="Giá trị" value={r.value} onChange={(e) => set(i, { value: e.target.value })} />
          <input className="inp text-sm" placeholder="Chỉ tiêu (EN)" value={r.label_en ?? ""} onChange={(e) => set(i, { label_en: e.target.value })} />
          <input className="inp text-sm" placeholder="Giá trị (EN)" value={r.value_en ?? ""} onChange={(e) => set(i, { value_en: e.target.value })} />
          <button type="button" aria-label="Xóa" className="btn-danger col-span-2 sm:col-span-1" onClick={() => setRows((x) => x.filter((_, k) => k !== i))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => setRows((r) => [...r, { label: "", value: "" }])}>
        <Plus size={15} /> Thêm chỉ tiêu
      </button>
    </div>
  );
}
