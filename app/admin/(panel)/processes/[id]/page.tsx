import { notFound } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { getProcess, getSteps, getVariety } from "@/lib/repo";
import { F, Notice, PageHead, Section } from "@/components/admin/ui";
import { StepsEditor } from "@/components/admin/StepsEditor";
import { FileInput } from "@/components/admin/MediaInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteProcess, newProcessVersion, saveProcess } from "../../../actions";

export const metadata = { title: "Soạn quy trình" };

export default async function ProcessEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  await requireUser("editor");
  const { id } = await params;
  const sp = await searchParams;
  const p = await getProcess(Number(id));
  if (!p) notFound();
  const [variety, steps, usage] = await Promise.all([
    getVariety(p.variety_id),
    getSteps(p.id),
    one<{ n: number }>(`SELECT count(*)::int AS n FROM models WHERE process_id = $1`, [p.id]),
  ]);

  return (
    <div>
      <PageHead
        back="/admin/processes"
        title={p.title}
        subtitle={`${variety?.code} · ${p.region} · Phiên bản ${p.version} · ${usage?.n ?? 0} mô hình đang dùng`}
        actions={
          <form action={newProcessVersion}>
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton className="btn" pendingText="Đang tạo…" confirm="Tạo phiên bản mới từ quy trình này? Các mô hình đang dùng vẫn giữ phiên bản hiện tại.">
              <CopyPlus size={16} /> Tạo phiên bản mới
            </SubmitButton>
          </form>
        }
      />
      {sp.saved === "1" && <Notice>Đã lưu quy trình.</Notice>}
      {sp.saved === "version" && <Notice>Đã tạo phiên bản mới (trạng thái Nháp). Chỉnh sửa rồi chuyển sang "Đang áp dụng".</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      {(usage?.n ?? 0) > 0 && (
        <Notice tone="gold">
          Quy trình đang được {usage?.n} mô hình sử dụng: thay đổi sẽ hiện ngay trên trang của các mô hình đó. Nếu là thay đổi lớn về kỹ thuật, nên tạo phiên bản mới.
        </Notice>
      )}

      <form action={saveProcess} className="space-y-5">
        <input type="hidden" name="id" value={p.id} />
        <Section title="Thông tin quy trình">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Tên quy trình *">
              <input name="title" className="inp" defaultValue={p.title} required />
            </F>
            <F label="Tên (tiếng Anh)">
              <input name="title_en" className="inp" defaultValue={p.title_en ?? ""} />
            </F>
            <F label="Vùng áp dụng *">
              <input name="region" className="inp" defaultValue={p.region} required />
            </F>
            <F label="Vùng (tiếng Anh)">
              <input name="region_en" className="inp" defaultValue={p.region_en ?? ""} />
            </F>
            <F label="Trạng thái">
              <select name="status" className="inp" defaultValue={p.status}>
                <option value="draft">Nháp (chưa chọn được cho mô hình mới)</option>
                <option value="published">Đang áp dụng</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </F>
            <F label="Tài liệu quy trình gốc (PDF)" hint="Người xem tải về được từ trang công khai">
              <FileInput name="source_file" folder="process" accept="application/pdf" initial={{ key: p.source_file, name: p.source_name }} label="Tải PDF lên" />
            </F>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <F label="Giới thiệu, đặc tính giống tại vùng" hint="Hỗ trợ **in đậm**, gạch đầu dòng">
              <textarea name="intro" rows={6} className="inp font-mono text-sm" defaultValue={p.intro ?? ""} />
            </F>
            <F label="Giới thiệu (tiếng Anh)">
              <textarea name="intro_en" rows={6} className="inp font-mono text-sm" defaultValue={p.intro_en ?? ""} />
            </F>
          </div>
        </Section>

        <Section title={`Các bước kỹ thuật (${steps.length})`} desc="Bấm vào từng bước để soạn thuyết minh, vật tư, hình ảnh và sơ đồ minh họa. Số ngày sau gieo dùng để tính ngày dự kiến và tiến độ.">
          <StepsEditor name="steps" initial={steps} />
        </Section>

        <div className="sticky bottom-16 z-10 flex justify-end gap-2 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <SubmitButton>Lưu quy trình</SubmitButton>
        </div>
      </form>

      {(usage?.n ?? 0) === 0 && (
        <form action={deleteProcess} className="mt-5 text-right">
          <input type="hidden" name="id" value={p.id} />
          <SubmitButton className="btn-danger" confirm="Xóa vĩnh viễn quy trình này?" pendingText="Đang xóa…">
            Xóa quy trình
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
