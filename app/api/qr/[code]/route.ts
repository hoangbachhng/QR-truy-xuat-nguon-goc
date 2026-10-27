import QRCode from "qrcode";
import { getModelByCode } from "@/lib/repo";
import { publicModelUrl } from "@/lib/urls";

// Ảnh mã QR của mô hình: /api/qr/MH-2026-002?format=svg|png&size=1024
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const model = await getModelByCode(code);
  if (!model) return new Response("Không tìm thấy mô hình", { status: 404 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  const size = Math.min(Math.max(Number(url.searchParams.get("size")) || 1024, 128), 4096);
  const target = publicModelUrl(model.code, true);
  const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#00512d", light: "#ffffff" } };
  const filename = `QR-${model.code}.${format}`;
  const disposition = url.searchParams.get("download") ? `attachment; filename="${filename}"` : "inline";
  if (format === "png") {
    const buf = await QRCode.toBuffer(target, { ...opts, width: size, type: "png" });
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Content-Disposition": disposition } });
  }
  const svg = await QRCode.toString(target, { ...opts, type: "svg" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": disposition } });
}
