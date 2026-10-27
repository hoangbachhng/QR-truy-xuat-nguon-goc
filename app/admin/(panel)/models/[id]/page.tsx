import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Printer, Download, ExternalLink, NotebookPen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getModel, listLots, listProcesses, listTemplates, listVarieties, modelAssignees } from "@/lib/repo";
import { publicModelUrl } from "@/lib/urls";
import { todayVN } from "@/lib/format";
import { fileUrl } from "@/lib/storage";
import type { CustomField, Model } from "@/lib/types";
import { F, Notice, PageHead, Section, STATUS_LABEL } from "@/components/admin/ui";
import { FieldBuilder } from "@/components/admin/FieldBuilder";
import { ImagesInput } from "@/components/admin/MediaInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteModel, saveModel } from "../../../actions";

export const metadata = { title: "Mô hình" };

export default async function ModelEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; err?: string; template?: string }>;
}) {
  await requireUser("editor");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const model: Partial<Model> | undefined = isNew ? { status: "active", published: true, year: Number(todayVN().slice(0, 4)), fields: [] } : await getModel(Number(id));
  if (!model) notFound();

  const [varieties, processes, lots, templates, assignees, staff] = await Promise.all([
    listVarieties(),
    listProcesses(),
    listLots(),
    listTemplates(),
    isNew ? Promise.resolve([] as number[]) : modelAssignees(model.id!),
    q<{ id: number; name: string; role: string }>(`SELECT id, name, role FROM users WHERE active AND role IN ('reporter','editor') ORDER BY role DESC, name`),
  ]);
  // Mô hình mới: áp sẵn mẫu trường đầu tiên để không phải tạo lại từ đầu
  let fields: CustomField[] = model.fields || [];
  if (isNew) {
    const t = templates.find((x) => String(x.id) === sp.template) ?? templates[0];
    fields = (t?.fields || []).map((f: CustomField) => ({ ...f, id: "f_" + Math.random().toString(36).slice(2, 10), value: undefined }));
  }

  return (
    <div>
      <PageHead
        back="/admin/models"
        title={isNew ? "Thêm mô hình trình diễn" : `Mô hình ${model.code}`}
        subtitle={isNew ? "Mã mô hình tự sinh nếu để trống" : STATUS_LABEL[model.status!]}
        actions={
          !isNew && (
            <>
              <Link href={`/admin/diary/new?model=${model.id}`} className="btn">
                <NotebookPen size={16} /> Ghi nhật ký
              </Link>
              <a href={`/m/${model.code}`} target="_blank" className="btn">
                <ExternalLink size={16} /> Xem trang công khai
              </a>
            </>
          )
        }
      />
      {sp.saved && <Notice>Đã lưu.</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <form action={saveModel} className="space-y-5">
          {!isNew && <input type="hidden" name="id" value={model.id} />}

          <Section title="Thông tin chung">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <F label="Mã mô hình" hint="Để trống: tự sinh MH-năm-số thứ tự">
                <input name="code" className="inp" defaultValue={model.code} placeholder="MH-2026-004" />
              </F>
              <F label="Giống *">
                <select name="variety_id" className="inp" defaultValue={model.variety_id ?? ""} required>
                  <option value="" disabled>
                    — Chọn giống —
                  </option>
                  {varieties.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} – {v.name}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Quy trình kỹ thuật áp dụng" hint="Chọn đúng giống và vùng">
                <select name="process_id" className="inp" defaultValue={model.process_id ?? ""}>
                  <option value="">— Chưa gắn —</option>
                  {processes
                    .filter((p) => p.status !== "archived" || p.id === model.process_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.variety_code} – {p.region} (bản {p.version}
                        {p.status === "draft" ? ", nháp" : ""})
                      </option>
                    ))}
                </select>
              </F>
              <F label="Mã lô giống" hint="Chọn từ danh sách hoặc gõ mã lô">
                <input name="lot_code" className="inp" list="lot-codes" defaultValue={model.lot_code ?? ""} />
                <datalist id="lot-codes">
                  {lots.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.variety_code} · {l.seed_class}
                    </option>
                  ))}
                </datalist>
              </F>
              <F label="Vụ">
                <input name="season" className="inp" defaultValue={model.season ?? ""} placeholder="Đông Xuân 2026–2027" />
              </F>
              <F label="Năm">
                <input name="year" type="number" className="inp" defaultValue={model.year ?? ""} />
              </F>
              <F label="Trạng thái">
                <select name="status" className="inp" defaultValue={model.status}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </F>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={model.published} className="h-4 w-4 accent-[#005b36]" /> Hiển thị công khai khi quét QR
              </label>
            </div>
          </Section>

          <Section title="Thông tin bắt buộc" desc="Luôn hiển thị trên trang công khai. Có thể nhập ngày dự kiến rồi cập nhật sau.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["sow_date", "Ngày gieo", "date"],
                  ["heading_date", "Ngày trỗ", "date"],
                  ["harvest_date", "Dự kiến thu hoạch", "date"],
                  ["yield_expected", "Năng suất dự kiến (tấn/ha)", "number"],
                ] as const
              ).map(([name, label, type]) => (
                <F key={name} label={label}>
                  <div className="relative">
                    <input
                      name={name}
                      type={type}
                      step={type === "number" ? "any" : undefined}
                      inputMode={type === "number" ? "decimal" : undefined}
                      className="inp pr-8"
                      defaultValue={(model as any)[name] ?? ""}
                      required
                    />
                    <Lock size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone" aria-label="Trường bắt buộc" />
                  </div>
                </F>
              ))}
              <F label="Năng suất thực tế (tấn/ha)" hint="Nhập sau khi thu hoạch">
                <input name="yield_actual" type="number" step="any" inputMode="decimal" className="inp" defaultValue={model.yield_actual ?? ""} />
              </F>
            </div>
          </Section>

          <Section title="Thông tin tùy chỉnh" desc="Thêm, bớt, sắp xếp các dòng thông tin như câu hỏi Google Form">
            <FieldBuilder name="fields" initial={fields} templates={templates as any} />
          </Section>

          <Section title="Địa điểm, hộ hợp tác">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <F label="Tỉnh / thành phố">
                <input name="province" className="inp" defaultValue={model.province ?? ""} />
              </F>
              <F label="Xã / phường">
                <input name="commune" className="inp" defaultValue={model.commune ?? ""} />
              </F>
              <F label="Huyện (nếu cần)">
                <input name="district" className="inp" defaultValue={model.district ?? ""} />
              </F>
              <F label="Thôn, ấp, xứ đồng">
                <input name="address" className="inp" defaultValue={model.address ?? ""} />
              </F>
              <F label="Diện tích (ha)">
                <input name="area_ha" type="number" step="any" inputMode="decimal" className="inp" defaultValue={model.area_ha ?? ""} />
              </F>
              <F label="Hộ / HTX hợp tác">
                <input name="farmer_name" className="inp" defaultValue={model.farmer_name ?? ""} />
              </F>
              <F label="Vĩ độ" hint="Lấy từ Google Maps (nhấn giữ vào vị trí ruộng)">
                <input name="lat" type="number" step="any" className="inp" defaultValue={model.lat ?? ""} placeholder="10.4567" />
              </F>
              <F label="Kinh độ">
                <input name="lng" type="number" step="any" className="inp" defaultValue={model.lng ?? ""} placeholder="105.6789" />
              </F>
            </div>
          </Section>

          <Section title="Phụ trách" desc="Người được giao có thể ghi nhật ký cho mô hình này">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Cán bộ phụ trách (hiện trên trang công khai)">
                <input name="staff_name" className="inp" defaultValue={model.staff_name ?? ""} />
              </F>
              <F label="Số điện thoại / Zalo">
                <input name="staff_phone" type="tel" className="inp" defaultValue={model.staff_phone ?? ""} />
              </F>
            </div>
            <p className="lbl mt-4">Giao ghi nhật ký cho</p>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-mist">
                  <input type="checkbox" name="assignees" value={u.id} defaultChecked={assignees.includes(u.id)} className="h-4 w-4 accent-[#005b36]" />
                  {u.name} <span className="text-xs text-stone">({u.role === "editor" ? "Biên tập" : "Ghi nhật ký"})</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Giới thiệu, ảnh bìa">
            <div className="grid gap-3 lg:grid-cols-2">
              <F label="Giới thiệu ngắn">
                <textarea name="summary" rows={3} className="inp" defaultValue={model.summary ?? ""} />
              </F>
              <F label="Giới thiệu (tiếng Anh)">
                <textarea name="summary_en" rows={3} className="inp" defaultValue={model.summary_en ?? ""} />
              </F>
            </div>
            <p className="lbl mt-3">Ảnh bìa</p>
            <ImagesInput name="cover_image" folder="model" captions={false} initial={model.cover_image ? [{ key: model.cover_image }] : []} />
          </Section>

          <div className="sticky bottom-16 z-10 flex justify-end gap-2 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
            <Link href="/admin/models" className="btn">
              Hủy
            </Link>
            <SubmitButton>{isNew ? "Tạo mô hình" : "Lưu thay đổi"}</SubmitButton>
          </div>
        </form>

        {!isNew && (
          <aside className="space-y-4">
            <section className="card text-center">
              <p className="lbl">Mã QR của mô hình</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${model.code}`} alt={`QR ${model.code}`} className="mx-auto w-48" />
              <p className="break-all text-xs text-stone">{publicModelUrl(model.code!)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`/api/qr/${model.code}?format=png&size=2048&download=1`} className="btn">
                  <Download size={15} /> PNG
                </a>
                <a href={`/api/qr/${model.code}?format=svg&download=1`} className="btn">
                  <Download size={15} /> SVG
                </a>
              </div>
              <a href={`/admin/print/sign/${model.id}`} target="_blank" className="btn-primary mt-2 w-full">
                <Printer size={15} /> In biển cắm ruộng
              </a>
            </section>
            {model.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(model.cover_image)} alt="" className="rounded-xl border border-line" />
            )}
            <form action={deleteModel} className="card">
              <input type="hidden" name="id" value={model.id} />
              <p className="mb-2 text-sm text-stone">Xóa mô hình sẽ xóa luôn nhật ký và thống kê lượt quét. Mã QR đã in sẽ không còn hoạt động.</p>
              <SubmitButton className="btn-danger w-full" confirm={`Xóa vĩnh viễn mô hình ${model.code}?`} pendingText="Đang xóa…">
                Xóa mô hình
              </SubmitButton>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
