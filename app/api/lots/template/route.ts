import { currentUser } from "@/lib/auth";
import { LOT_COLUMNS } from "@/lib/lots";

// File Excel mẫu để nhập lô giống hàng loạt
export async function GET() {
  if (!(await currentUser())) return new Response("Chưa đăng nhập", { status: 401 });
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Lô giống");
  ws.columns = LOT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005B36" } };
  ws.getRow(1).height = 32;
  ws.getRow(1).alignment = { wrapText: true, vertical: "middle" };
  ws.addRow({
    code: "VNR98-XN1-2026-04",
    variety_code: "VNR98",
    seed_class: "Xác nhận 1",
    production_date: "15/04/2026",
    producer: "Nhà máy chế biến giống …",
    quantity_kg: 50000,
    germination: 90,
    purity: 99,
    moisture: 13,
    test_date: "28/04/2026",
    parent_code: "VNR98-NC-2025-07",
    notes: "Dòng ví dụ – xóa trước khi nhập",
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-lo-giong.xlsx"',
    },
  });
}
