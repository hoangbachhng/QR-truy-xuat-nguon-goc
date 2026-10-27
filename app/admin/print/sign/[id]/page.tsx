import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getModel, getVariety } from "@/lib/repo";
import { publicModelUrl } from "@/lib/urls";
import { fmtNum } from "@/lib/format";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "In biển cắm ruộng" };

// Biển cắm ruộng khổ A4 ngang, theo mẫu "Biển cắm ruộng" trong Brand Guideline (trang 43)
export default async function SignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ theme?: string }> }) {
  await requireUser("editor");
  const { id } = await params;
  const { theme = "green" } = await searchParams;
  const m = await getModel(Number(id));
  if (!m) notFound();
  const v = await getVariety(m.variety_id);
  const qrSvg = await QRCode.toString(publicModelUrl(m.code, true), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#00512d", light: "#ffffff" } });
  const bg = theme === "brown" ? "#351800" : "#005b36";
  const cropLabel = v?.crop === "ngo" ? "Đồng ngô" : "Đồng lúa";

  return (
    <div className="min-h-screen bg-stone/30 p-4 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .sign { width: 297mm !important; height: 210mm !important; border-radius: 0 !important; box-shadow: none !important } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[1123px] flex-wrap items-center gap-2">
        <PrintButton />
        <a className="btn" href="?theme=green">
          Nền xanh
        </a>
        <a className="btn" href="?theme=brown">
          Nền nâu
        </a>
        <span className="text-sm text-stone">Khổ A4 ngang. Khi in, chọn "Không lề" và bật "In hình nền".</span>
      </div>
      <div
        className="sign relative mx-auto flex aspect-[297/210] w-full max-w-[1123px] flex-col overflow-hidden rounded-xl text-white shadow-xl"
        style={{ background: bg, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        {/* Hình đồ họa bổ trợ gốc (trang 18), đặt theo mẫu trang 43: cao ~66% biển, sát góc phải, đáy cắt ~16% */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme === "brown" ? "/brand/brand-graphic-earth.svg" : "/brand/brand-graphic-leaf.svg"}
          alt=""
          aria-hidden="true"
          className="absolute -bottom-[10.5%] right-0 aspect-square h-[66%] w-auto"
        />
        <div className="relative flex flex-1 flex-col p-[5%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.svg" alt="Vinaseed" className="h-[7%] w-auto self-start" />
          <div className="mt-[4%] flex flex-1 items-center gap-[5%]">
            <div className="flex-1">
              <p className="text-[2.2vw] font-bold uppercase tracking-wide text-gold print:text-[22pt]">Mô hình trình diễn · {cropLabel}</p>
              <h1 className="mt-[1%] text-[5.2vw] font-bold uppercase leading-tight print:text-[50pt]">Giống {v?.code}</h1>
              <p className="text-[2vw] print:text-[19pt]">{v?.name}</p>
              <div className="mt-[4%] space-y-[0.6%] text-[1.6vw] print:text-[15pt]">
                {m.season && <p>Vụ: <b>{m.season}</b></p>}
                {(m.commune || m.province) && <p>Địa điểm: <b>{[m.commune, m.province].filter(Boolean).join(", ")}</b></p>}
                {m.area_ha != null && <p>Diện tích: <b>{fmtNum(m.area_ha)} ha</b></p>}
                {m.farmer_name && <p>Hộ hợp tác: <b>{m.farmer_name}</b></p>}
              </div>
            </div>
            <div className="w-[32%] rounded-2xl bg-white p-[2%] text-center text-[#00512d]">
              <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="mt-[3%] text-[1.5vw] font-bold leading-snug print:text-[14pt]">Quét mã để xem quy trình, tiến độ và nguồn gốc lô giống</p>
              <p className="mt-[2%] text-[1.2vw] print:text-[11pt]">{m.code}</p>
            </div>
          </div>
          <p className="text-[1.3vw] text-white/80 print:text-[12pt]">Sử dụng công nghệ tiên tiến · www.vinaseed.com.vn</p>
        </div>
      </div>
    </div>
  );
}
