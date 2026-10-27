// Sinh sơ đồ minh họa (SVG) cho dữ liệu mẫu quy trình VNR98. Chạy: node gen-diagrams.mjs <thư mục ra>
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
const FONT = `font-family="UTM Neo Sans Intel, Segoe UI, Arial, sans-serif"`;
const G = "#005b36", G2 = "#00512d", LEAF = "#789a3d", GOLD = "#e8b909", BROWN = "#351800", LINE = "#d1d3d4", BG = "#f1f2f2", MUTED = "#808285";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${FONT}><rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size || 15}" fill="${o.fill || BROWN}" ${o.bold ? 'font-weight="700"' : ""} text-anchor="${o.anchor || "start"}">${esc(s)}</text>`;

function fertTimeline(file, title, unit, items, total) {
  const W = 960, H = 400, axisY = 150;
  // chừa đủ lề để thẻ đầu/cuối không bị cắt
  const cw0 = Math.min((W - 60) / items.length - 14, 180);
  const x0 = 30 + cw0 / 2, x1 = W - 70 - cw0 / 2;
  const step = (x1 - x0) / (items.length - 1);
  let b = text(30, 40, title, { size: 20, bold: true, fill: G }) + text(30, 64, unit, { size: 14, fill: MUTED });
  b += `<line x1="${x0 - 30}" y1="${axisY}" x2="${x1 + 40}" y2="${axisY}" stroke="${LEAF}" stroke-width="4" stroke-linecap="round"/>`;
  b += `<path d="M${x1 + 40} ${axisY - 8} L${x1 + 54} ${axisY} L${x1 + 40} ${axisY + 8} Z" fill="${LEAF}"/>`;
  items.forEach((it, i) => {
    const x = x0 + i * step, cw = Math.min(step - 14, 180);
    b += `<circle cx="${x}" cy="${axisY}" r="11" fill="${it.gold ? GOLD : G}" stroke="#fff" stroke-width="3"/>`;
    b += text(x, axisY - 44, it.name, { size: 16, bold: true, anchor: "middle", fill: G2 });
    b += text(x, axisY - 24, it.when, { size: 13, anchor: "middle", fill: MUTED });
    const ch = 30 + it.lines.length * 24;
    b += `<rect x="${x - cw / 2}" y="${axisY + 28}" width="${cw}" height="${ch}" rx="10" fill="${BG}" stroke="${LINE}"/>`;
    it.lines.forEach((l, j) => (b += text(x, axisY + 58 + j * 24, l, { size: 15, anchor: "middle" })));
  });
  b += `<rect x="30" y="${H - 62}" width="${W - 60}" height="40" rx="8" fill="${G}"/>`;
  b += text(W / 2, H - 36, total, { size: 15, bold: true, anchor: "middle", fill: "#fff" });
  writeFileSync(join(out, file), svg(W, H, b));
}

fertTimeline(
  "bon-phan-dbscl.svg",
  "Lịch bón phân VNR98 – Đồng bằng sông Cửu Long",
  "Lượng bón cho 1 ha (kg)",
  [
    { name: "Bón lót", when: "Trước khi sạ", lines: ["50 DAP"] },
    { name: "Thúc 1", when: "8–10 ngày sau sạ", lines: ["50 DAP", "40 Urê", "20 KCl"] },
    { name: "Thúc 2", when: "Sau tỉa, dặm", lines: ["50 DAP", "60 Urê", "30 KCl"] },
    { name: "Đón đòng", when: "Đòng dài 3–4 mm", lines: ["40 Urê", "30 KCl"], gold: true },
    { name: "Nuôi hạt", when: "Lúa trỗ đều", lines: ["20 Urê", "20 KCl"], gold: true },
  ],
  "Tổng: 150 kg DAP + 160 kg Urê + 100 kg KCl / ha (điều chỉnh theo vùng đất và mùa vụ)",
);

fertTimeline(
  "bon-phan-dhntb.svg",
  "Lịch bón phân VNR98 – Duyên hải Nam Trung Bộ",
  "Lượng bón cho 1 sào (500 m²), kg",
  [
    { name: "Bón lót", when: "Trước cày / làm đất lần cuối", lines: ["Vôi 20–25 (khi cày)", "Phân chuồng + Lân", "NPK 3–4"] },
    { name: "Thúc 1", when: "12–15 ngày sau sạ", lines: ["Urê 3–4", "Kali 3–4"] },
    { name: "Thúc 2", when: "20–25 ngày sau sạ", lines: ["Urê 3", "NPK 3"] },
    { name: "Đón đòng", when: "45–55 ngày sau sạ", lines: ["Urê 2", "Kali 2–3"], gold: true },
  ],
  "Vụ Mùa, Hè Thu: giảm 10% lượng đạm, tăng 15% kali so với vụ Đông Xuân",
);

// Ngâm ủ giống – ĐBSCL
{
  const W = 960, H = 300;
  let b = text(30, 40, "Ngâm ủ hạt giống VNR98 – Đồng bằng sông Cửu Long", { size: 20, bold: true, fill: G });
  b += text(30, 64, "Lượng giống 100 kg/ha khi mặt ruộng tốt, đã diệt sạch ốc bươu vàng", { size: 14, fill: MUTED });
  const steps = [
    ["1. Ngâm", "24 giờ", "bằng nước sạch"],
    ["2. Rửa giống", "lúc 12 giờ", "và 24 giờ sau ngâm"],
    ["3. Ủ", "12–36 giờ", "ở 30–35°C"],
    ["4. Gieo", "rễ mầm dài", "bằng ½ hạt"],
  ];
  const w = 190, gap = 40, x0 = (W - (4 * w + 3 * gap)) / 2, y = 100;
  steps.forEach(([a, b1, c], i) => {
    const x = x0 + i * (w + gap);
    b += `<rect x="${x}" y="${y}" width="${w}" height="130" rx="14" fill="${i === 3 ? G : BG}" stroke="${i === 3 ? G : LINE}"/>`;
    const fc = i === 3 ? "#fff" : BROWN;
    b += text(x + w / 2, y + 40, a, { size: 17, bold: true, anchor: "middle", fill: i === 3 ? "#fff" : G2 });
    b += text(x + w / 2, y + 74, b1, { size: 22, bold: true, anchor: "middle", fill: i === 3 ? GOLD : BROWN });
    b += text(x + w / 2, y + 102, c, { size: 15, anchor: "middle", fill: fc });
    if (i < 3) b += `<path d="M${x + w + 8} ${y + 65} L${x + w + gap - 8} ${y + 65}" stroke="${LEAF}" stroke-width="4"/><path d="M${x + w + gap - 14} ${y + 57} L${x + w + gap - 4} ${y + 65} L${x + w + gap - 14} ${y + 73} Z" fill="${LEAF}"/>`;
  });
  b += text(W / 2, 270, "Rửa hết nước chua, để ráo vỏ hạt trước khi ủ. Theo dõi nhiệt độ, ẩm độ trong suốt quá trình ủ.", { size: 14, anchor: "middle", fill: MUTED });
  writeFileSync(join(out, "ngam-u-dbscl.svg"), svg(W, H, b));
}

// Chế độ nước – ĐBSCL
{
  const W = 960, H = 380, x0 = 80, x1 = 900, yBase = 250, cm = 10; // 1 cm nước = 10 px
  let b = text(30, 40, "Chế độ nước ruộng VNR98 – Đồng bằng sông Cửu Long", { size: 20, bold: true, fill: G });
  b += text(30, 64, "Mực nước trên mặt ruộng theo giai đoạn (minh họa, không theo tỷ lệ thời gian)", { size: 14, fill: MUTED });
  // mặt ruộng
  b += `<rect x="${x0}" y="${yBase}" width="${x1 - x0}" height="40" fill="#8a6a3d" opacity="0.35"/>`;
  b += `<line x1="${x0}" y1="${yBase}" x2="${x1}" y2="${yBase}" stroke="${BROWN}" stroke-width="2"/>`;
  const segs = [
    [x0, 210, 0, "Giữ ẩm", "3–5 ngày sau sạ"],
    [210, 430, 4, "Nước 3–5 cm", "khi lúa giáp tán"],
    [430, 690, -1, "Ngập – khô xen kẽ", "đến khi lúa bắt đầu trỗ"],
    [690, 820, 4, "Giữ nước", "trỗ – chín"],
    [820, x1, 0, "Tháo cạn", "khi lúa vàng đuôi"],
  ];
  segs.forEach(([a, z, lvl, t1, t2], i) => {
    if (lvl > 0) b += `<rect x="${a}" y="${yBase - lvl * cm}" width="${z - a}" height="${lvl * cm}" fill="#5aa9d6" opacity="0.55"/>`;
    if (lvl < 0) {
      let d = `M${a} ${yBase}`;
      const n = 4, w = (z - a) / n;
      for (let k = 0; k < n; k++) d += ` L${a + k * w + w / 2} ${yBase - 40} L${a + (k + 1) * w} ${yBase}`;
      b += `<path d="${d} Z" fill="#5aa9d6" opacity="0.45"/>`;
    }
    if (i > 0) b += `<line x1="${a}" y1="100" x2="${a}" y2="${yBase + 40}" stroke="${LINE}" stroke-dasharray="5 5"/>`;
    const cx = (a + z) / 2;
    b += text(cx, 122, t1, { size: 15, bold: true, anchor: "middle", fill: G2 });
    b += text(cx, 142, t2, { size: 13, anchor: "middle", fill: MUTED });
  });
  // cây lúa minh họa
  for (let x = x0 + 20; x < x1; x += 34) {
    const h = x < 210 ? 14 : x < 430 ? 30 : x < 690 ? 50 : 66;
    b += `<path d="M${x} ${yBase} q-6 ${-h / 2} -10 ${-h} M${x} ${yBase} q0 ${-h / 2} 0 ${-h - 4} M${x} ${yBase} q6 ${-h / 2} 10 ${-h}" stroke="${x > 690 ? GOLD : LEAF}" stroke-width="2.5" fill="none"/>`;
  }
  b += text(x0, yBase + 70, "Sạ", { size: 14, bold: true });
  b += text(x1, yBase + 70, "Thu hoạch", { size: 14, bold: true, anchor: "end" });
  b += `<line x1="${x0 + 30}" y1="${yBase + 65}" x2="${x1 - 80}" y2="${yBase + 65}" stroke="${MUTED}"/><path d="M${x1 - 86} ${yBase + 60} L${x1 - 78} ${yBase + 65} L${x1 - 86} ${yBase + 70}" stroke="${MUTED}" fill="none"/>`;
  writeFileSync(join(out, "nuoc-ruong-dbscl.svg"), svg(W, H, b));
}

// Lên luống – DHNTB
{
  const W = 960, H = 370, y = 210;
  let b = text(30, 40, "Làm đất, lên luống VNR98 – Duyên hải Nam Trung Bộ", { size: 20, bold: true, fill: G });
  b += text(30, 64, "Mặt cắt ngang luống (minh họa)", { size: 14, fill: MUTED });
  const bedW = 300, gapW = 80, x0 = 60;
  let d = `M30 ${y + 40} L${x0} ${y + 40}`;
  for (let i = 0; i < 2; i++) {
    const a = x0 + i * (bedW + gapW);
    d += ` L${a + 10} ${y} L${a + bedW - 10} ${y} L${a + bedW} ${y + 40}`;
    if (i < 1) d += ` L${a + bedW + gapW} ${y + 40}`;
  }
  d += ` L930 ${y + 40} L930 ${y + 80} L30 ${y + 80} Z`;
  b += `<path d="${d}" fill="#b08a55" opacity="0.55" stroke="${BROWN}" stroke-width="1.5"/>`;
  for (let i = 0; i < 2; i++) {
    const a = x0 + i * (bedW + gapW);
    for (let x = a + 30; x < a + bedW - 20; x += 30)
      b += `<path d="M${x} ${y} q-4 -14 -8 -26 M${x} ${y} q0 -14 0 -30 M${x} ${y} q4 -14 8 -26" stroke="${LEAF}" stroke-width="2.5" fill="none"/>`;
    // kích thước luống
    b += `<line x1="${a + 10}" y1="${y - 60}" x2="${a + bedW - 10}" y2="${y - 60}" stroke="${G}" stroke-width="2"/>`;
    b += `<path d="M${a + 10} ${y - 66} v12 M${a + bedW - 10} ${y - 66} v12" stroke="${G}" stroke-width="2"/>`;
    b += text(a + bedW / 2, y - 70, "Mặt luống rộng 1,4 m", { size: 15, bold: true, anchor: "middle", fill: G2 });
  }
  // khoảng cách băng giữa 2 luống
  const g0 = x0 + bedW, g1 = g0 + gapW;
  b += `<line x1="${g0}" y1="${y + 110}" x2="${g1}" y2="${y + 110}" stroke="${BROWN}" stroke-width="2"/><path d="M${g0} ${y + 104} v12 M${g1} ${y + 104} v12" stroke="${BROWN}" stroke-width="2"/>`;
  b += text((g0 + g1) / 2, y + 100, "Băng 25–30 cm", { size: 14, bold: true, anchor: "middle" });
  // chiều cao luống
  const hx = x0 + 2 * bedW + gapW + 20;
  b += `<line x1="${hx}" y1="${y}" x2="${hx}" y2="${y + 40}" stroke="${BROWN}" stroke-width="2"/><path d="M${hx - 6} ${y} h12 M${hx - 6} ${y + 40} h12" stroke="${BROWN}" stroke-width="2"/>`;
  b += text(hx + 12, y + 25, "Cao 10–15 cm", { size: 14, bold: true });
  b += text(30, 355, "Đất tơi nhuyễn, bằng phẳng, sạch cỏ dại. Trang phẳng, rút hết nước trên mặt luống rồi mới gieo.", { size: 14, fill: MUTED });
  writeFileSync(join(out, "luong-dhntb.svg"), svg(W, H, b));
}
console.log("ok");
