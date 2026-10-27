import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getVariety } from "@/lib/repo";
import type { Variety } from "@/lib/types";
import { F, Notice, PageHead, Section } from "@/components/admin/ui";
import { SpecsEditor } from "@/components/admin/SpecsEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteVariety, saveVariety } from "../../../actions";

export const metadata = { title: "Giống" };

export default async function VarietyEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  await requireUser("editor");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const v: Partial<Variety> | undefined = isNew ? { crop: "lua", specs: [] } : await getVariety(Number(id));
  if (!v) notFound();
  return (
    <div>
      <PageHead back="/admin/varieties" title={isNew ? "Thêm giống" : `Giống ${v.code}`} />
      {sp.saved && <Notice>Đã lưu.</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      <form action={saveVariety} className="space-y-5">
        {!isNew && <input type="hidden" name="id" value={v.id} />}
        <Section title="Thông tin giống">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="Mã giống *">
              <input name="code" className="inp" defaultValue={v.code} placeholder="VNR98" required />
            </F>
            <F label="Cây trồng">
              <select name="crop" className="inp" defaultValue={v.crop}>
                <option value="lua">Lúa</option>
                <option value="ngo">Ngô</option>
              </select>
            </F>
            <F label="Tên giống *" className="sm:col-span-2">
              <input name="name" className="inp" defaultValue={v.name} required />
            </F>
            <F label="Tên (tiếng Anh)" className="sm:col-span-2">
              <input name="name_en" className="inp" defaultValue={v.name_en ?? ""} />
            </F>
            <F label="Thời gian sinh trưởng điển hình (ngày)" hint="Dùng tính tiến độ khi mô hình chưa có ngày thu hoạch" className="sm:col-span-2">
              <input name="growth_days" type="number" className="inp" defaultValue={v.growth_days ?? ""} />
            </F>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <F label="Nguồn gốc">
              <textarea name="origin" rows={2} className="inp" defaultValue={v.origin ?? ""} />
            </F>
            <F label="Nguồn gốc (tiếng Anh)">
              <textarea name="origin_en" rows={2} className="inp" defaultValue={v.origin_en ?? ""} />
            </F>
            <F label="Đặc tính giống" hint="Hỗ trợ **in đậm**, gạch đầu dòng">
              <textarea name="characteristics" rows={6} className="inp" defaultValue={v.characteristics ?? ""} />
            </F>
            <F label="Đặc tính (tiếng Anh)">
              <textarea name="characteristics_en" rows={6} className="inp" defaultValue={v.characteristics_en ?? ""} />
            </F>
          </div>
        </Section>
        <Section title="Bảng chỉ tiêu" desc="Hiện dạng bảng trên trang công khai: thời gian sinh trưởng, chiều cao, năng suất…">
          <SpecsEditor name="specs" initial={v.specs || []} />
        </Section>
        <div className="flex justify-end">
          <SubmitButton>{isNew ? "Thêm giống" : "Lưu thay đổi"}</SubmitButton>
        </div>
      </form>
      {!isNew && (
        <form action={deleteVariety} className="mt-5 text-right">
          <input type="hidden" name="id" value={v.id} />
          <SubmitButton className="btn-danger" confirm={`Xóa giống ${v.code}?`} pendingText="Đang xóa…">
            Xóa giống
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
