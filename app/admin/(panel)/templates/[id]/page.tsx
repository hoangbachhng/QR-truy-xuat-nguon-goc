import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import type { CustomField } from "@/lib/types";
import { F, Notice, PageHead, Section } from "@/components/admin/ui";
import { FieldBuilder } from "@/components/admin/FieldBuilder";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteTemplate, saveTemplate } from "../../../actions";

export const metadata = { title: "Mẫu trường" };

export default async function TemplateEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  await requireUser("editor");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const t = isNew
    ? { name: "", crop: "lua", fields: [] as CustomField[] }
    : await one<{ id: number; name: string; crop: string | null; fields: CustomField[] }>(`SELECT * FROM field_templates WHERE id = $1`, [Number(id)]);
  if (!t) notFound();
  return (
    <div>
      <PageHead back="/admin/templates" title={isNew ? "Thêm mẫu trường" : t.name} subtitle="Sửa mẫu không ảnh hưởng mô hình đã tạo trước đó" />
      {sp.saved && <Notice>Đã lưu.</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      <form action={saveTemplate} className="space-y-5">
        {"id" in t && <input type="hidden" name="id" value={t.id} />}
        <Section title="Thông tin mẫu">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Tên mẫu *">
              <input name="name" className="inp" defaultValue={t.name} required />
            </F>
            <F label="Cây trồng">
              <select name="crop" className="inp" defaultValue={t.crop ?? ""}>
                <option value="">Dùng chung</option>
                <option value="lua">Lúa</option>
                <option value="ngo">Ngô</option>
              </select>
            </F>
          </div>
        </Section>
        <Section title="Các trường">
          <FieldBuilder name="fields" initial={t.fields} mode="template" />
        </Section>
        <div className="flex justify-end">
          <SubmitButton>Lưu mẫu</SubmitButton>
        </div>
      </form>
      {"id" in t && (
        <form action={deleteTemplate} className="mt-5 text-right">
          <input type="hidden" name="id" value={t.id} />
          <SubmitButton className="btn-danger" confirm="Xóa mẫu này?" pendingText="Đang xóa…">
            Xóa mẫu
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
