import Link from "next/link";
import { Plus, FileSpreadsheet, Download, Database } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listLots } from "@/lib/repo";
import { fmtDate, fmtNum } from "@/lib/format";
import { Badge, Empty, Notice, PageHead, Section } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { importLots } from "../../actions";

export const metadata = { title: "Lô giống" };

export default async function LotsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const lots = await listLots();
  return (
    <div>
      <PageHead
        title="Lô giống – truy xuất nguồn gốc"
        subtitle="Giai đoạn 1: nhập tay hoặc Excel. Giai đoạn 2: phần mềm kho đồng bộ qua API (xem Cài đặt, API)."
        actions={
          <Link href="/admin/lots/new" className="btn-primary">
            <Plus size={16} /> Thêm lô
          </Link>
        }
      />
      {sp.imported !== undefined && (
        <Notice tone={Number(sp.skipped) ? "gold" : "green"}>
          Đã nhập {sp.imported} lô từ Excel{Number(sp.skipped) ? `, bỏ qua ${sp.skipped} dòng (lô đã đồng bộ từ phần mềm kho hoặc dữ liệu lỗi)` : ""}.
        </Notice>
      )}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}
      {sp.deleted && <Notice>Đã xóa lô.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="card overflow-x-auto p-0">
          {lots.length === 0 ? (
            <div className="p-4">
              <Empty>Chưa có lô giống.</Empty>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Giống · Cấp</th>
                  <th>Ngày SX</th>
                  <th className="text-right">Nảy mầm</th>
                  <th>Nguồn</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={l.id} className="hover:bg-mist/50">
                    <td>
                      <Link href={`/admin/lots/${l.id}`} className="font-bold text-brand hover:underline">
                        {l.code}
                      </Link>
                      {l.parent_code && <span className="block text-xs text-stone">Lô mẹ: {l.parent_code}</span>}
                    </td>
                    <td>
                      {l.variety_code}
                      <span className="block text-xs text-stone">{l.seed_class}</span>
                    </td>
                    <td>{fmtDate(l.production_date)}</td>
                    <td className="text-right">{l.germination != null ? `${fmtNum(l.germination)}%` : ""}</td>
                    <td>
                      <Badge tone={l.source === "wms" ? "brown" : "gray"}>
                        <Database size={11} /> {l.source === "wms" ? "Phần mềm kho" : "Nhập tay"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Section title="Nhập từ Excel" desc="Dùng file mẫu; lô trùng mã sẽ được cập nhật.">
          <a href="/api/lots/template" className="btn mb-3 w-full">
            <Download size={15} /> Tải file Excel mẫu
          </a>
          <form action={importLots} className="space-y-2">
            <input type="file" name="file" accept=".xlsx" required className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-2 file:font-bold" />
            <SubmitButton className="btn-primary w-full" pendingText="Đang nhập…">
              <FileSpreadsheet size={15} /> Nhập dữ liệu
            </SubmitButton>
          </form>
        </Section>
      </div>
    </div>
  );
}
