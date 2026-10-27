import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProcesses, listVarieties } from "@/lib/repo";
import { Badge, Empty, Notice, PageHead, Section } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createProcess } from "../../actions";

export const metadata = { title: "Quy trình kỹ thuật" };
const STATUS = { draft: ["Nháp", "gray"], published: ["Đang áp dụng", "green"], archived: ["Lưu trữ", "brown"] } as const;

export default async function ProcessesPage({ searchParams }: { searchParams: Promise<{ err?: string; deleted?: string }> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const [processes, varieties] = await Promise.all([listProcesses(), listVarieties()]);
  return (
    <div>
      <PageHead title="Thư viện quy trình kỹ thuật chuẩn" subtitle="Mỗi giống có thể có nhiều quy trình theo vùng sinh thái, mỗi quy trình có nhiều phiên bản" />
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      {sp.deleted && <Notice>Đã xóa quy trình.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          {processes.length === 0 ? (
            <Empty>Chưa có quy trình nào.</Empty>
          ) : (
            <ul className="space-y-2">
              {processes.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/processes/${p.id}`} className="card flex items-start gap-3 hover:border-brand">
                    <BookOpenCheck className="mt-0.5 shrink-0 text-leaf" size={20} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-dark">{p.title}</p>
                      <p className="text-sm text-stone">
                        {p.variety_code} · {p.region} · Bản {p.version} · {p.step_count} bước · {p.model_count} mô hình đang dùng
                      </p>
                    </div>
                    <Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Section title="Thêm quy trình mới">
          <form action={createProcess} className="space-y-3">
            <label className="block">
              <span className="lbl">Giống</span>
              <select name="variety_id" className="inp" required defaultValue="">
                <option value="" disabled>
                  — Chọn giống —
                </option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} – {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Vùng áp dụng</span>
              <input name="region" className="inp" placeholder="Đồng bằng sông Hồng" required />
            </label>
            <SubmitButton className="btn-primary w-full">Tạo và soạn các bước</SubmitButton>
            {varieties.length === 0 && (
              <p className="text-sm text-stone">
                Chưa có giống nào. <Link href="/admin/varieties/new" className="text-brand underline">Thêm giống</Link> trước.
              </p>
            )}
          </form>
        </Section>
      </div>
    </div>
  );
}
