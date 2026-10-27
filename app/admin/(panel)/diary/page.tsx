import Link from "next/link";
import { Plus, Pencil, Check, ImageIcon } from "lucide-react";
import { requireUser, can } from "@/lib/auth";
import { q } from "@/lib/db";
import { listModels } from "@/lib/repo";
import { fmtDate } from "@/lib/format";
import type { DiaryEntry } from "@/lib/types";
import { Badge, COMPLIANCE_LABEL, Empty, Notice, PageHead } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { approveDiary } from "../../actions";

export const metadata = { title: "Nhật ký" };

export default async function DiaryList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const editor = can(user, "editor");
  const models = await listModels(editor ? {} : { assignedTo: user.id });
  const params: unknown[] = [];
  const where: string[] = [];
  if (sp.model) {
    params.push(Number(sp.model));
    where.push(`d.model_id = $${params.length}`);
  }
  if (sp.pending) where.push(`NOT d.approved`);
  if (!editor) {
    params.push(user.id);
    where.push(`d.model_id IN (SELECT model_id FROM model_assignees WHERE user_id = $${params.length})`);
  }
  const rows = await q<DiaryEntry & { model_code: string; step_title: string | null; step_pos: number | null }>(
    `SELECT d.*, m.code AS model_code, s.title AS step_title, s.position AS step_pos, u.name AS author_name
     FROM diary_entries d JOIN models m ON m.id = d.model_id
     LEFT JOIN process_steps s ON s.id = d.step_id LEFT JOIN users u ON u.id = d.author_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY d.entry_date DESC, d.id DESC LIMIT 200`,
    params,
  );

  return (
    <div>
      <PageHead
        title="Nhật ký thực tế"
        subtitle={`${rows.length} mục`}
        actions={
          <Link href={sp.model ? `/admin/diary/new?model=${sp.model}` : "/admin/diary/new"} className="btn-primary">
            <Plus size={16} /> Ghi nhật ký
          </Link>
        }
      />
      {sp.saved === "1" && <Notice>Đã lưu nhật ký.</Notice>}
      {sp.saved === "pending" && <Notice tone="gold">Đã lưu. Nhật ký sẽ hiện trên trang công khai sau khi được duyệt.</Notice>}
      {sp.approved && <Notice>Đã duyệt nhật ký.</Notice>}
      {sp.deleted && <Notice>Đã xóa nhật ký.</Notice>}

      <form className="card mb-4 flex flex-wrap gap-2">
        <select name="model" defaultValue={sp.model ?? ""} className="inp w-auto min-w-56 flex-1">
          <option value="">Tất cả mô hình</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} · {m.variety_code} · {m.province}
            </option>
          ))}
        </select>
        {editor && (
          <label className="flex items-center gap-2 px-2 text-sm">
            <input type="checkbox" name="pending" value="1" defaultChecked={!!sp.pending} /> Chỉ chờ duyệt
          </label>
        )}
        <button className="btn-primary">Lọc</button>
      </form>

      {rows.length === 0 ? (
        <Empty>Chưa có nhật ký.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => {
            const canEdit = editor || d.author_id === user.id;
            return (
              <li key={d.id} className="card">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-brand">{d.model_code}</b>
                  <span className="text-sm">{fmtDate(d.entry_date)}</span>
                  <Badge tone={d.compliance === "ok" ? "green" : d.compliance === "adjusted" ? "gold" : "gray"}>{COMPLIANCE_LABEL[d.compliance]}</Badge>
                  {!d.approved && <Badge tone="red">Chờ duyệt</Badge>}
                  {d.images?.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-stone">
                      <ImageIcon size={13} /> {d.images.length}
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    {editor && !d.approved && (
                      <form action={approveDiary}>
                        <input type="hidden" name="id" value={d.id} />
                        <SubmitButton className="btn py-1" pendingText="…">
                          <Check size={14} /> Duyệt
                        </SubmitButton>
                      </form>
                    )}
                    {canEdit && (
                      <Link href={`/admin/diary/${d.id}`} className="btn py-1">
                        <Pencil size={14} /> Sửa
                      </Link>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {d.step_title && (
                    <span className="font-bold text-brand-dark">
                      Bước {d.step_pos}. {d.step_title}:{" "}
                    </span>
                  )}
                  {d.content}
                </p>
                <p className="mt-1 text-xs text-stone">{d.author_name}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
