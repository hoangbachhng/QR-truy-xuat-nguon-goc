import Link from "next/link";
import { Plus, QrCode, ExternalLink, Printer, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listModels } from "@/lib/repo";
import { fmtDate } from "@/lib/format";
import { Badge, Empty, Notice, PageHead, STATUS_LABEL } from "@/components/admin/ui";

export const metadata = { title: "Mô hình" };

export default async function ModelsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : undefined;
  const models = await listModels({ q: sp.q, year, crop: sp.crop, status: sp.status });
  const years = [...new Set([new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1, ...models.map((m) => m.year).filter(Boolean)])].sort().reverse();
  const printQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && ["q", "year", "crop", "status"].includes(k)) as [string, string][]).toString();

  return (
    <div>
      <PageHead
        title="Mô hình trình diễn"
        subtitle={`${models.length} mô hình`}
        actions={
          <>
            <a href={`/admin/print/qr?${printQs}`} target="_blank" className="btn">
              <Printer size={16} /> In QR hàng loạt
            </a>
            <Link href="/admin/models/new" className="btn-primary">
              <Plus size={16} /> Thêm mô hình
            </Link>
          </>
        }
      />
      {sp.deleted && <Notice>Đã xóa mô hình.</Notice>}

      <form className="card mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={sp.q} className="inp" placeholder="Tìm mã, giống, tỉnh, hộ hợp tác…" />
        <select name="year" defaultValue={sp.year ?? ""} className="inp">
          <option value="">Mọi năm</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select name="crop" defaultValue={sp.crop ?? ""} className="inp">
          <option value="">Lúa và ngô</option>
          <option value="lua">Lúa</option>
          <option value="ngo">Ngô</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="inp">
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-primary">
          <Search size={16} /> Lọc
        </button>
      </form>

      {models.length === 0 ? (
        <Empty>Không có mô hình phù hợp.</Empty>
      ) : (
        <>
          {/* Điện thoại: dạng thẻ */}
          <ul className="space-y-2 md:hidden">
            {models.map((m) => (
              <li key={m.id} className="card">
                <Link href={`/admin/models/${m.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-brand">{m.code}</b>
                    <Badge tone={m.status === "active" ? "gold" : "green"}>{STATUS_LABEL[m.status]}</Badge>
                  </div>
                  <p className="font-bold">{m.variety_code}</p>
                  <p className="text-xs text-stone">
                    {m.season} · {m.province} · Gieo {fmtDate(m.sow_date)}
                  </p>
                  <p className="mt-1 text-xs text-stone">
                    {m.diary_count} nhật ký · {m.scan_count} lượt quét {!m.published && "· Đang ẩn"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {/* Máy tính: dạng bảng */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Giống</th>
                  <th>Vụ · Địa điểm</th>
                  <th>Ngày gieo</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Nhật ký</th>
                  <th className="text-right">Quét QR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-mist/50">
                    <td>
                      <Link href={`/admin/models/${m.id}`} className="font-bold text-brand hover:underline">
                        {m.code}
                      </Link>
                      {!m.published && <span className="block text-xs text-red-700">Đang ẩn</span>}
                    </td>
                    <td>{m.variety_code}</td>
                    <td>
                      {m.season}
                      <span className="block text-xs text-stone">{[m.commune, m.province].filter(Boolean).join(", ")}</span>
                    </td>
                    <td>{fmtDate(m.sow_date)}</td>
                    <td>
                      <Badge tone={m.status === "active" ? "gold" : "green"}>{STATUS_LABEL[m.status]}</Badge>
                    </td>
                    <td className="text-right">{m.diary_count}</td>
                    <td className="text-right">{m.scan_count}</td>
                    <td className="whitespace-nowrap text-right">
                      <a href={`/api/qr/${m.code}?format=png&download=1`} className="mr-2 inline-flex text-stone hover:text-brand" title="Tải mã QR">
                        <QrCode size={17} />
                      </a>
                      <a href={`/m/${m.code}`} target="_blank" className="inline-flex text-stone hover:text-brand" title="Xem trang công khai">
                        <ExternalLink size={17} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
