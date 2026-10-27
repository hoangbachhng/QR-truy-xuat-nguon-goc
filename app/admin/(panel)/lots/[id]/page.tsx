import { notFound } from "next/navigation";
import { Database } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getLot, listLots, listVarieties } from "@/lib/repo";
import type { Lot } from "@/lib/types";
import { F, Notice, PageHead, Section } from "@/components/admin/ui";
import { FileInput } from "@/components/admin/MediaInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteLot, saveLot } from "../../../actions";

export const metadata = { title: "Lô giống" };

export default async function LotEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  await requireUser("editor");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const lot: Partial<Lot> | undefined = isNew ? { source: "manual" } : await getLot(Number(id));
  if (!lot) notFound();
  const [varieties, lots, models] = await Promise.all([
    listVarieties(),
    listLots(),
    isNew ? Promise.resolve([]) : q<{ code: string }>(`SELECT code FROM models WHERE lot_code = $1 ORDER BY code`, [lot.code]),
  ]);
  const locked = lot.source === "wms";
  const val = (k: keyof Lot) => (lot[k] ?? "") as string | number;

  return (
    <div>
      <PageHead back="/admin/lots" title={isNew ? "Thêm lô giống" : `Lô ${lot.code}`} subtitle={models.length ? `Dùng cho mô hình: ${models.map((m) => m.code).join(", ")}` : undefined} />
      {sp.saved && <Notice>Đã lưu.</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      {locked && (
        <Notice tone="gold">
          <Database size={14} className="mr-1 inline" />
          Lô được đồng bộ từ phần mềm kho lúc {lot.synced_at ? new Date(lot.synced_at).toLocaleString("vi-VN") : ""}. Thông tin chính chỉ sửa được ở phần mềm kho; ở đây chỉ bổ sung phiếu kiểm nghiệm và ghi chú.
        </Notice>
      )}
      <form action={saveLot} className="space-y-5">
        {!isNew && <input type="hidden" name="id" value={lot.id} />}
        <Section title="Thông tin lô">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <F label="Mã lô *">
              <input name="code" className="inp" defaultValue={val("code")} required disabled={locked} />
            </F>
            <F label="Giống">
              <select name="variety_id" className="inp" defaultValue={lot.variety_id ?? ""} disabled={locked}>
                <option value="">—</option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code}
                  </option>
                ))}
              </select>
            </F>
            <F label="Cấp giống">
              <input name="seed_class" className="inp" list="seed-classes" defaultValue={val("seed_class")} disabled={locked} />
              <datalist id="seed-classes">
                <option value="Siêu nguyên chủng" />
                <option value="Nguyên chủng" />
                <option value="Xác nhận 1" />
                <option value="Xác nhận 2" />
                <option value="F1" />
              </datalist>
            </F>
            <F label="Ngày sản xuất">
              <input name="production_date" type="date" className="inp" defaultValue={val("production_date")} disabled={locked} />
            </F>
            <F label="Cơ sở sản xuất">
              <input name="producer" className="inp" defaultValue={val("producer")} disabled={locked} />
            </F>
            <F label="Số lượng (kg)">
              <input name="quantity_kg" type="number" step="any" className="inp" defaultValue={val("quantity_kg")} disabled={locked} />
            </F>
            <F label="Lô mẹ" hint="Để dựng hành trình SNC → NC → XN">
              <input name="parent_code" className="inp" list="lot-codes" defaultValue={val("parent_code")} disabled={locked} />
              <datalist id="lot-codes">
                {lots.filter((l) => l.code !== lot.code).map((l) => (
                  <option key={l.id} value={l.code}>
                    {l.seed_class}
                  </option>
                ))}
              </datalist>
            </F>
          </div>
        </Section>
        <Section title="Kiểm nghiệm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="Tỷ lệ nảy mầm (%)">
              <input name="germination" type="number" step="any" className="inp" defaultValue={val("germination")} disabled={locked} />
            </F>
            <F label="Độ sạch (%)">
              <input name="purity" type="number" step="any" className="inp" defaultValue={val("purity")} disabled={locked} />
            </F>
            <F label="Độ ẩm (%)">
              <input name="moisture" type="number" step="any" className="inp" defaultValue={val("moisture")} disabled={locked} />
            </F>
            <F label="Ngày kiểm nghiệm">
              <input name="test_date" type="date" className="inp" defaultValue={val("test_date")} disabled={locked} />
            </F>
            <F label="Phiếu kiểm nghiệm (PDF/ảnh)" className="sm:col-span-2">
              <FileInput name="cert_file" folder="lot" initial={{ key: lot.cert_file ?? null, name: lot.cert_name ?? null }} />
            </F>
            <F label="Ghi chú nội bộ" className="sm:col-span-2" hint="Không hiển thị trên trang công khai">
              <textarea name="notes" rows={2} className="inp" defaultValue={val("notes")} />
            </F>
          </div>
          {lot.extra && Object.keys(lot.extra).length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-stone">Dữ liệu bổ sung từ phần mềm kho</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-mist p-2 text-xs">{JSON.stringify(lot.extra, null, 2)}</pre>
            </details>
          )}
        </Section>
        <div className="flex justify-end">
          <SubmitButton>{isNew ? "Thêm lô" : "Lưu thay đổi"}</SubmitButton>
        </div>
      </form>
      {!isNew && !locked && (
        <form action={deleteLot} className="mt-5 text-right">
          <input type="hidden" name="id" value={lot.id} />
          <SubmitButton className="btn-danger" confirm={`Xóa lô ${lot.code}?`} pendingText="Đang xóa…">
            Xóa lô
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
