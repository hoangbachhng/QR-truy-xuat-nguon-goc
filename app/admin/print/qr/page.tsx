import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { listModels } from "@/lib/repo";
import { publicModelUrl } from "@/lib/urls";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "In QR hàng loạt" };

// In tem QR hàng loạt (theo bộ lọc ở danh sách mô hình): lưới 3 cột trên A4 dọc.
export default async function PrintQr({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const models = await listModels({ q: sp.q, year: sp.year ? Number(sp.year) : undefined, crop: sp.crop, status: sp.status });
  const items = await Promise.all(
    models.map(async (m) => ({
      m,
      svg: await QRCode.toString(publicModelUrl(m.code, true), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#00512d", light: "#ffffff" } }),
    })),
  );
  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <style>{`@page { size: A4 portrait; margin: 10mm }`}</style>
      <div className="no-print mb-4 flex items-center gap-3">
        <PrintButton />
        <span className="text-sm text-stone">{items.length} mã QR</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map(({ m, svg }) => (
          <div key={m.id} className="break-inside-avoid rounded-lg border-2 border-brand p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="Vinaseed" className="mx-auto mb-2 h-4" />
            <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-1 font-bold text-brand">{m.variety_code}</p>
            <p className="text-xs">{m.code}</p>
            <p className="text-[10px] text-stone">{[m.season, m.province].filter(Boolean).join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
