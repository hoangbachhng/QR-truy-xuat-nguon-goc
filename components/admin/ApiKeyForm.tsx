"use client";

import { useActionState, useState } from "react";
import { KeyRound, Copy, Check } from "lucide-react";
import { createApiKey } from "@/app/admin/actions";

// Khóa API chỉ hiện đúng 1 lần ngay sau khi tạo (CSDL chỉ lưu bản băm).
export function ApiKeyForm() {
  const [state, action, pending] = useActionState(createApiKey, {} as { key?: string; error?: string });
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <form action={action} className="flex flex-wrap gap-2">
        <input name="name" className="inp w-auto min-w-56 flex-1" placeholder="Tên khóa, ví dụ: Phần mềm kho" />
        <button className="btn-primary" disabled={pending}>
          <KeyRound size={15} /> {pending ? "Đang tạo…" : "Tạo khóa mới"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.key && (
        <div className="mt-3 rounded-lg border border-gold bg-gold/10 p-3 text-sm">
          <p className="mb-1 font-bold">Sao chép và gửi khóa này cho đơn vị làm phần mềm kho. Khóa sẽ không hiện lại.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1">{state.key}</code>
            <button
              type="button"
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(state.key!);
                setCopied(true);
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
