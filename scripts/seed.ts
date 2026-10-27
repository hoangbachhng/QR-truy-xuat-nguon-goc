import "./load-env";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";
import { saveFile } from "../lib/storage";
import type { CustomField, Material } from "../lib/types";

// Dữ liệu mẫu: giống VNR98 với 2 quy trình theo vùng (theo file "VNR98 QUY TRINH CANH TAC DHNTB&DBSCL.pdf"),
// 3 mô hình, chuỗi lô giống và tài khoản mẫu.
// Chạy: npm run seed            (bỏ qua nếu đã có dữ liệu)
//       npm run seed -- --reset (XÓA SẠCH dữ liệu rồi tạo lại)

const reset = process.argv.includes("--reset");

interface StepSeed {
  stage: string;
  title: string;
  title_en?: string;
  day_from?: number | null;
  day_to?: number | null;
  timing_note?: string;
  content: string;
  materials?: Material[];
  images?: { file: string; caption: string; caption_en?: string }[];
  warning?: string;
}

const DBSCL_STEPS: StepSeed[] = [
  {
    stage: "Chuẩn bị",
    title: "Thời vụ",
    title_en: "Sowing calendar",
    timing_note: "ĐX: 15/11–10/12 · HT: 10/5–10/6",
    content:
      "Đối với vùng Đồng bằng sông Cửu Long, thời gian gieo sạ có thể tham khảo như sau:\n\n- **Vụ Đông Xuân:** gieo sạ từ 15/11 – 10/12\n- **Vụ Hè Thu:** gieo sạ từ 10/5 – 10/6",
  },
  {
    stage: "Chuẩn bị",
    title: "Làm đất",
    title_en: "Land preparation",
    day_from: -10,
    day_to: -3,
    timing_note: "Trước khi ngâm ủ giống",
    content:
      "Đất được xới trục đất và trang khỏa mặt bằng thật kỹ, rồi đào mương đánh rãnh thoát nước thật tốt. Sau đó cho nước vào ngâm 2–3 đêm để phun thuốc ốc bươu vàng; khi nào giống nẩy mầm mới tháo nước ra để sạ.",
  },
  {
    stage: "Chuẩn bị",
    title: "Lượng giống và ngâm ủ",
    title_en: "Seed rate, soaking and incubation",
    day_from: -3,
    day_to: -1,
    timing_note: "2–3 ngày trước sạ",
    content:
      "Lượng giống cần ngâm ủ là **100 kg/ha** với điều kiện mặt bằng ruộng tốt và diệt sạch ốc bươu vàng.\n\n" +
      "- Ngâm giống trong **24 giờ** bằng nước sạch, rửa giống 2 lần lúc 12 giờ và 24 giờ sau ngâm.\n" +
      "- Trước khi ủ cần rửa hết nước chua và để cho ráo vỏ hạt.\n" +
      "- Ủ giống trong **12–36 giờ ở nhiệt độ 30–35°C** tùy theo hình thức sạ hàng hay sạ lan. Thường xuyên theo dõi để điều chỉnh nhiệt độ và ẩm độ phù hợp.\n" +
      "- Khi rễ mầm có chiều dài bằng ½ hạt thì có thể gieo được.\n\n" +
      "Để phòng ngừa rầy di trú và bọ trĩ ở giai đoạn đầu có thể xử lý thuốc trong thời gian ủ giống đúng theo hướng dẫn trên nhãn thuốc.",
    materials: [{ item: "Hạt giống VNR98", dose: "100 kg/ha" }],
    images: [{ file: "ngam-u-dbscl.svg", caption: "Các bước ngâm ủ hạt giống", caption_en: "Seed soaking and incubation steps" }],
  },
  {
    stage: "Bón phân",
    title: "Bón lót",
    title_en: "Basal fertilizer",
    day_from: -1,
    day_to: 0,
    timing_note: "Trước khi sạ",
    content:
      "Bón thúc sớm để tăng số bông/m², đồng thời tăng lượng kali ở giai đoạn đón đòng. Tùy theo vùng đất và mùa vụ, lượng phân có thể bón cho 1 ha là: **150 kg DAP + 160 kg Urê + 100 kg KCl**, chia thành 5 lần bón như sơ đồ.",
    materials: [{ item: "DAP", dose: "50 kg/ha" }],
    images: [{ file: "bon-phan-dbscl.svg", caption: "Lịch bón phân cả vụ (kg/ha)", caption_en: "Fertilizer schedule (kg/ha)" }],
  },
  {
    stage: "Gieo sạ",
    title: "Sạ giống",
    title_en: "Sowing",
    day_from: 0,
    day_to: 0,
    timing_note: "Ngày sạ",
    content:
      "Trước khi sạ giống một đêm cần tháo cạn nước.\n\n" +
      "- **Sạ hàng:** khi hạt \"nứt nanh\" đều, dùng máy sạ hàng lỗ 8 mm là sạ đủ giống.\n" +
      "- **Sạ lan:** ngâm ủ giống khi rễ và mầm ra dài bằng ½ hạt thóc là có thể sạ được.",
  },
  {
    stage: "Chăm sóc",
    title: "Chăm sóc sau sạ, quản lý nước",
    title_en: "Post-sowing care and water management",
    day_from: 0,
    day_to: 90,
    timing_note: "Suốt vụ",
    content:
      "Theo dõi phòng trừ ốc bươu vàng. Phun thuốc Sofit trừ cỏ dại. Cấy dặm để bảo đảm mật độ.\n\n" +
      "Giữ đất ẩm trong vòng **3–5 ngày sau khi sạ**, sau đó cho nước vào đều khắp ruộng **3–5 cm** khi lúa giáp tán, sau đó áp dụng chế độ **tưới ngập – khô xen kẽ** đến lúa bắt đầu trỗ; khi lúa vàng đuôi tháo cạn nước để dễ thu hoạch.",
    images: [{ file: "nuoc-ruong-dbscl.svg", caption: "Chế độ nước theo giai đoạn", caption_en: "Water regime by stage" }],
  },
  {
    stage: "Bón phân",
    title: "Bón thúc lần 1",
    title_en: "First top-dressing",
    day_from: 8,
    day_to: 10,
    timing_note: "8–10 ngày sau sạ",
    content: "Bón thúc sớm để tăng số bông/m².",
    materials: [
      { item: "DAP", dose: "50 kg/ha" },
      { item: "Urê", dose: "40 kg/ha" },
      { item: "KCl", dose: "20 kg/ha" },
    ],
  },
  {
    stage: "Bón phân",
    title: "Bón thúc lần 2",
    title_en: "Second top-dressing",
    day_from: 18,
    day_to: 22,
    timing_note: "Sau khi tỉa, dặm",
    content: "Bón sau khi đã tỉa, dặm định mật độ.",
    materials: [
      { item: "DAP", dose: "50 kg/ha" },
      { item: "Urê", dose: "60 kg/ha" },
      { item: "KCl", dose: "30 kg/ha" },
    ],
  },
  {
    stage: "Làm đòng",
    title: "Bón đón đòng",
    title_en: "Panicle initiation fertilizer",
    day_from: 40,
    day_to: 45,
    timing_note: "Lúc đòng lúa dài 3–4 mm",
    content: "Tăng lượng kali ở giai đoạn đón đòng.",
    materials: [
      { item: "Urê", dose: "40 kg/ha" },
      { item: "KCl", dose: "30 kg/ha" },
    ],
  },
  {
    stage: "Trỗ – chín",
    title: "Bón nuôi hạt",
    title_en: "Grain-filling fertilizer",
    day_from: 65,
    day_to: 70,
    timing_note: "Lúc lúa trỗ đều",
    content: "Bón khi lúa trỗ đều để nuôi hạt.",
    materials: [
      { item: "Urê", dose: "20 kg/ha" },
      { item: "KCl", dose: "20 kg/ha" },
    ],
  },
  {
    stage: "Bảo vệ thực vật",
    title: "Phòng trừ dịch hại",
    title_en: "Pest and disease management",
    day_from: 0,
    day_to: 95,
    timing_note: "Suốt vụ",
    content:
      "Thường xuyên kiểm tra đồng ruộng, phát hiện kịp thời sâu bệnh để có biện pháp phòng trừ thích hợp. Nên áp dụng các biện pháp phòng trừ tổng hợp. Các loại thuốc thường dùng được lưu hành trên thị trường.",
    warning: "Khi lúa trỗ phải xử lý phòng trừ các loại nấm bệnh trên hạt.",
  },
  {
    stage: "Thu hoạch",
    title: "Thu hoạch",
    title_en: "Harvest",
    day_from: 93,
    day_to: 100,
    timing_note: "Khi lúa vàng đuôi",
    content: "Khi lúa vàng đuôi tháo cạn nước để dễ thu hoạch.",
  },
];

const DHNTB_STEPS: StepSeed[] = [
  {
    stage: "Chuẩn bị",
    title: "Thời vụ",
    title_en: "Sowing calendar",
    timing_note: "ĐX: 25/11–15/01 · HT: 10/05–10/06",
    content:
      "Đối với vùng Duyên hải Nam Trung Bộ, thời gian gieo sạ có thể tham khảo như sau:\n\n- **Vụ Đông Xuân:** gieo sạ từ 25/11 – 15/01\n- **Vụ Hè Thu:** gieo sạ từ 10/05 – 10/06",
  },
  {
    stage: "Chuẩn bị",
    title: "Làm đất, lên luống",
    title_en: "Land preparation and bed forming",
    day_from: -10,
    day_to: -3,
    timing_note: "Trước khi ngâm ủ giống",
    content:
      "Đất phải tơi nhuyễn, bằng phẳng, sạch cỏ dại và cây trồng vụ trước. Sau đó lên luống, trang phẳng, rút hết nước trên mặt luống rồi mới gieo, để không bị chết cây cục bộ và tiện cho việc phun thuốc trừ cỏ tiền nảy mầm sau này. Ngâm nước 2–3 đêm để xử lý ốc bươu vàng. Khi giống nảy mầm mới tháo nước ra để sạ.\n\n" +
      "Lên luống **rộng 1,4 m, cao 10–15 cm**; khoảng cách các băng **25–30 cm**.",
    images: [{ file: "luong-dhntb.svg", caption: "Kích thước luống và băng", caption_en: "Bed and furrow dimensions" }],
  },
  {
    stage: "Bón phân",
    title: "Bón lót",
    title_en: "Basal fertilizer",
    day_from: -5,
    day_to: 0,
    timing_note: "Trước khi cày và làm đất lần cuối",
    content:
      "**Tổng lượng phân bón cho 1 sào (500 m²)/vụ:** Vôi 20–25 kg; Phân chuồng hoai mục 350–400 kg; Urê 8–9 kg; Lân 20–25 kg; Kali 5–7 kg; NPK (16-16-8) 6–7 kg. Nếu không có phân chuồng bón 20 kg phân hữu cơ Humic.\n\n" +
      "**Bón lót:** Vôi bột bón trước khi cày đất. Toàn bộ phân chuồng + phân lân + 3–4 kg NPK bón trước khi làm đất lần cuối để sạ.",
    materials: [
      { item: "Vôi bột", dose: "20–25 kg/sào", note: "Bón trước khi cày" },
      { item: "Phân chuồng hoai mục", dose: "350–400 kg/sào", note: "Hoặc 20 kg phân hữu cơ Humic" },
      { item: "Lân", dose: "20–25 kg/sào" },
      { item: "NPK (16-16-8)", dose: "3–4 kg/sào" },
    ],
    images: [{ file: "bon-phan-dhntb.svg", caption: "Lịch bón phân cả vụ (kg/sào)", caption_en: "Fertilizer schedule (kg per 500 m²)" }],
  },
  {
    stage: "Chuẩn bị",
    title: "Lượng giống và ngâm ủ",
    title_en: "Seed rate, soaking and incubation",
    day_from: -3,
    day_to: -1,
    timing_note: "2–3 ngày trước sạ",
    content:
      "Ruộng đã làm phẳng, diệt sạch ốc bươu vàng.\n\n**Cách ngâm ủ:**\n\n" +
      "- Trước khi ngâm ủ phải kiểm tra vệ sinh sạch sẽ bao bì và dụng cụ ngâm ủ.\n" +
      "- Trước khi ngâm ủ phải phơi lại hạt giống dưới nắng nhẹ 2–3 giờ.\n" +
      "- Đãi loại bỏ những hạt lép lửng, ngâm trong nước vôi trong 2% trong 12 giờ rồi rửa sạch, ngâm tiếp trong nước sạch từ 24–36 giờ; trong khoảng thời gian ngâm này cứ 12 giờ thì thay nước rửa chua.\n\n" +
      "**Ủ giống:** Phải đảm bảo nhiệt độ thích hợp cho hạt nảy mầm, nhất là giai đoạn đầu. Thường xuyên theo dõi để điều chỉnh nhiệt độ và ẩm độ phù hợp. Khi rễ mầm có chiều dài bằng ½ hạt thì có thể gieo được.\n\n" +
      "Trong giai đoạn ngâm ủ có thể sử dụng thuốc xử lý hạt giúp hạt giống khỏe mạnh, phòng chống bọ trĩ, rệp, sâu ăn lá… trong giai đoạn 20–25 ngày sau sạ. Liều lượng thuốc xử lý đúng theo hướng dẫn trên nhãn thuốc.",
    materials: [
      { item: "Sạ vãi", dose: "4–5 kg/sào", note: "Tương đương 80–100 kg/ha" },
      { item: "Sạ hàng", dose: "3–3,5 kg/sào", note: "Tương đương 60–70 kg/ha" },
      { item: "Nước vôi trong", dose: "2%", note: "Ngâm 12 giờ" },
    ],
  },
  {
    stage: "Gieo sạ",
    title: "Sạ giống",
    title_en: "Sowing",
    day_from: 0,
    day_to: 0,
    timing_note: "Ngày sạ",
    content:
      "- **Trước sạ 1 đêm:** tháo cạn nước ruộng.\n- **Sạ hàng:** khi hạt \"nứt nanh\" đều, dùng máy sạ hàng lỗ 8 mm.\n- **Sạ lan:** khi rễ và mầm dài bằng ½ hạt thóc.",
  },
  {
    stage: "Chăm sóc",
    title: "Phun thuốc trừ cỏ",
    title_en: "Herbicide application",
    day_from: 2,
    day_to: 3,
    timing_note: "2–3 ngày sau sạ",
    content: "Sau khi sạ 2–3 ngày phun thuốc trừ cỏ theo liều lượng và cách sử dụng theo hướng dẫn trên nhãn chai.",
  },
  {
    stage: "Chăm sóc",
    title: "Quản lý nước",
    title_en: "Water management",
    day_from: 0,
    day_to: 95,
    timing_note: "Suốt vụ",
    content:
      "Giữ nước vừa phải trên ruộng để lúa sinh trưởng phát triển tốt, đất đủ ẩm trong 6–7 ngày đầu sau sạ, sau đó giữ mực nước 1–2 cm cho đến trước tỉa dặm. Khi tỉa dặm đến giai đoạn đẻ nhánh thường xuyên giữ mực nước 3–5 cm. Trong quá trình giữ nước phòng trừ ốc bươu vàng và các loại sâu nước cắn phá lá, dòi đục nõn.\n\n" +
      "Khi lúa kết thúc đẻ nhánh rút nước phơi ruộng 5–7 ngày (để nứt chân chim), sau đó giữ đủ nước trong suốt thời kỳ làm đòng, trỗ bông và vào chắc. Trước khi thu hoạch 7–10 ngày rút kiệt nước.",
  },
  {
    stage: "Bón phân",
    title: "Bón thúc lần 1",
    title_en: "First top-dressing",
    day_from: 12,
    day_to: 15,
    timing_note: "12–15 ngày sau sạ",
    content: "Bón thúc sớm để tăng số bông/m².",
    materials: [
      { item: "Urê", dose: "3–4 kg/sào" },
      { item: "Kali", dose: "3–4 kg/sào" },
    ],
  },
  {
    stage: "Chăm sóc",
    title: "Tỉa dặm, định mật độ",
    title_en: "Thinning and gap filling",
    day_from: 15,
    day_to: 20,
    timing_note: "Khi cây lúa được 3,5–4 lá",
    content: "Khi cây lúa được 3,5–4 lá tiến hành tỉa dặm, định mật độ, kết hợp làm cỏ, khử cây lúa chết, cây khác dạng…",
  },
  {
    stage: "Bón phân",
    title: "Bón thúc lần 2",
    title_en: "Second top-dressing",
    day_from: 20,
    day_to: 25,
    timing_note: "20–25 ngày sau sạ",
    content: "Bón thúc lần 2.",
    materials: [
      { item: "Urê", dose: "3 kg/sào" },
      { item: "NPK", dose: "3 kg/sào" },
    ],
  },
  {
    stage: "Làm đòng",
    title: "Bón đón đòng",
    title_en: "Panicle initiation fertilizer",
    day_from: 45,
    day_to: 55,
    timing_note: "45–55 ngày sau sạ",
    content: "Giai đoạn đón đòng: tăng lượng kali.",
    materials: [
      { item: "Urê", dose: "2 kg/sào" },
      { item: "Kali", dose: "2–3 kg/sào" },
    ],
    warning: "Vụ Mùa, Hè Thu giảm 10% lượng đạm, tăng 15% kali so với vụ Đông Xuân.",
  },
  {
    stage: "Bảo vệ thực vật",
    title: "Phòng trừ dịch hại",
    title_en: "Pest and disease management",
    day_from: 0,
    day_to: 100,
    timing_note: "Suốt vụ",
    content:
      "Thường xuyên kiểm tra đồng ruộng, phát hiện kịp thời sâu bệnh để có biện pháp phòng trừ thích hợp. Nên áp dụng các biện pháp phòng trừ tổng hợp. Các loại thuốc thường dùng được lưu hành trên thị trường.",
    warning: "Khi lúa trỗ phải xử lý phòng trừ các loại nấm bệnh trên hạt.",
  },
  {
    stage: "Thu hoạch",
    title: "Thu hoạch",
    title_en: "Harvest",
    day_from: 95,
    day_to: 105,
    timing_note: "Khi lúa chín 90–95%",
    content:
      "- Khi bông lúa vàng đuôi: rút cạn nước.\n" +
      "- Chọn thời tiết nắng ráo mới thu hoạch, khi lúa chín 90–95%, không nên thu hoạch trễ quá làm ảnh hưởng đến chất lượng giống.\n" +
      "- Thu hoạch xong đến đâu phơi đến đó, không để qua đêm, không để đống hạt giống khi còn ướt.\n" +
      "- Phơi liên tục 3–4 nắng và đảo đều khi phơi, không nên phơi ngoài ruộng để tránh hao hụt và giảm chất lượng.\n" +
      "- Khi phơi khô chế biến sạch cọng rơm rạ, hạ lép lửng và cho vào bao bảo quản.",
  },
];

const RICE_TEMPLATE: Omit<CustomField, "id">[] = [
  { type: "textarea", label: "Đặc tính sinh trưởng", label_en: "Growth characteristics" },
  { type: "select", label: "Khả năng chống đổ", label_en: "Lodging resistance", options: ["Tốt", "Khá", "Trung bình", "Kém"] },
  { type: "textarea", label: "Khả năng chống chịu sâu bệnh", label_en: "Pest and disease tolerance" },
  { type: "number", label: "Chiều cao cây", label_en: "Plant height", unit: "cm" },
  { type: "testimonials", label: "Nhận xét của chủ ruộng", label_en: "Farmer feedback" },
];
const CORN_TEMPLATE: Omit<CustomField, "id">[] = [
  { type: "textarea", label: "Đặc tính sinh trưởng", label_en: "Growth characteristics" },
  { type: "select", label: "Khả năng chống đổ", label_en: "Lodging resistance", options: ["Tốt", "Khá", "Trung bình", "Kém"] },
  { type: "number", label: "Chiều cao cây", label_en: "Plant height", unit: "cm" },
  { type: "number", label: "Số hàng hạt/bắp", label_en: "Kernel rows per ear", unit: "hàng" },
  { type: "testimonials", label: "Nhận xét của chủ ruộng", label_en: "Farmer feedback" },
];

let fid = 0;
const withIds = (fs: Omit<CustomField, "id">[], values: Record<string, any> = {}): CustomField[] =>
  fs.map((f) => ({ ...f, id: `f_seed${++fid}`, value: values[f.label] }));

async function main() {
  const db = await getDb();
  if (reset) {
    await db.query(
      `TRUNCATE audit_log, scans, api_keys, settings, diary_entries, model_assignees, models, field_templates, lots, process_steps, processes, varieties RESTART IDENTITY CASCADE`,
    );
    await db.query(`DELETE FROM users WHERE email <> $1`, [(process.env.ADMIN_EMAIL || "").toLowerCase()]);
    console.log("Đã xóa dữ liệu cũ.");
  } else if ((await db.query(`SELECT 1 FROM varieties LIMIT 1`)).length) {
    console.log("CSDL đã có dữ liệu, bỏ qua. Dùng `npm run seed -- --reset` để tạo lại từ đầu.");
    return;
  }

  // Tài khoản mẫu
  const seedPassword = process.env.SEED_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!seedPassword) throw new Error("Chưa đặt SEED_PASSWORD trong .env.local cho các tài khoản mẫu");
  const pw = await hashPassword(seedPassword);
  const user = async (email: string, name: string, role: string, phone: string) =>
    (
      await db.query(
        `INSERT INTO users (email, name, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [email, name, phone, pw, role],
      )
    )[0].id as number;
  const editorId = await user("marketing@vinaseed.local", "Cán bộ Marketing (mẫu)", "editor", "0900000001");
  const salesId = await user("kinhdoanh@vinaseed.local", "Cán bộ kinh doanh (mẫu)", "reporter", "0900000002");
  await db.query(`INSERT INTO settings (key, value) VALUES ('require_diary_approval', 'false') ON CONFLICT DO NOTHING`);

  // Mẫu trường
  await db.query(`INSERT INTO field_templates (name, crop, fields) VALUES ($1,'lua',$2), ($3,'ngo',$4)`, [
    "Mẫu lúa",
    JSON.stringify(withIds(RICE_TEMPLATE)),
    "Mẫu ngô",
    JSON.stringify(withIds(CORN_TEMPLATE)),
  ]);

  // Giống
  const [{ id: varietyId }] = await db.query(
    `INSERT INTO varieties (code, name, name_en, crop, origin, origin_en, characteristics, characteristics_en, specs, growth_days)
     VALUES ($1,$2,$3,'lua',$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      "VNR98",
      "Lúa thuần chất lượng cao VNR98",
      "VNR98 high-quality inbred rice",
      "VNR98 là giống lúa thuần chất lượng cao do Công ty Cổ phần Tập đoàn Giống cây trồng Việt Nam (Vinaseed) lai tạo.",
      "VNR98 is a high-quality inbred rice variety bred by Vietnam National Seed Group (Vinaseed).",
      "Khả năng đẻ nhánh khá, bông dài. Tỷ lệ gạo lật cao, hạt gạo hơi bạc bụng; cơm trắng, mềm, ngon và có mùi thơm nhẹ – khá đặc trưng. Cây lúa cứng, chống đổ tốt, nhưng nhiễm trung bình đến nặng một số đối tượng sâu bệnh.\n\nGiống có phạm vi thích ứng rộng cho năng suất cao, ổn định ở các vùng sinh thái.",
      "Good tillering, long panicles. High brown rice ratio; slightly chalky grain; cooked rice is white, soft, tasty with a light, distinctive aroma. Sturdy stems with good lodging resistance, but moderately to highly susceptible to some pests and diseases.\n\nWide adaptability with high, stable yields across ecological regions.",
      JSON.stringify([
        { label: "Thời gian sinh trưởng (ĐBSCL)", label_en: "Growth duration (Mekong Delta)", value: "ĐX 97–103 ngày · HT 97–98 ngày", value_en: "WS 97–103 days · SA 97–98 days" },
        { label: "Thời gian sinh trưởng (DHNTB)", label_en: "Growth duration (South Central Coast)", value: "ĐX 109–118 ngày · HT 97–102 ngày", value_en: "WS 109–118 days · SA 97–102 days" },
        { label: "Chiều cao cây", label_en: "Plant height", value: "89,4 – 108,6 cm" },
        { label: "Khối lượng 1.000 hạt", label_en: "1,000-grain weight", value: "23,7 – 26,3 g" },
        { label: "Tỷ lệ gạo lật", label_en: "Brown rice ratio", value: "77,6 – 79,4%" },
        { label: "Năng suất ĐBSCL", label_en: "Yield (Mekong Delta)", value: "ĐX 7,54–7,58 tấn/ha · HT 6,77–6,90 tấn/ha", value_en: "WS 7.54–7.58 t/ha · SA 6.77–6.90 t/ha" },
      ]),
      100,
    ],
  );

  // Quy trình
  const assets = join(process.cwd(), "seed", "assets");
  const assetKeys = new Map<string, string>();
  const asset = async (file: string) => {
    if (!assetKeys.has(file)) assetKeys.set(file, await saveFile("process", file, await readFile(join(assets, file)), "image/svg+xml"));
    return assetKeys.get(file)!;
  };
  const createProcess = async (region: string, region_en: string, intro: string, intro_en: string, steps: StepSeed[]) => {
    const [{ id }] = await db.query(
      `INSERT INTO processes (variety_id, region, region_en, title, title_en, intro, intro_en) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [varietyId, region, region_en, `Quy trình canh tác giống lúa VNR98 – ${region}`, `VNR98 cultivation protocol – ${region_en}`, intro, intro_en],
    );
    const ids: Record<string, number> = {};
    for (const [i, s] of steps.entries()) {
      const images = [];
      for (const im of s.images || []) images.push({ key: await asset(im.file), caption: im.caption, caption_en: im.caption_en });
      const [{ id: sid }] = await db.query(
        `INSERT INTO process_steps (process_id, position, stage, title, title_en, day_from, day_to, timing_note, content, materials, images, warning)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [id, i + 1, s.stage, s.title, s.title_en ?? null, s.day_from ?? null, s.day_to ?? null, s.timing_note ?? null, s.content, JSON.stringify(s.materials || []), JSON.stringify(images), s.warning ?? null],
      );
      ids[s.title] = sid;
    }
    return { id: id as number, steps: ids };
  };
  const dbscl = await createProcess(
    "Đồng bằng sông Cửu Long",
    "Mekong Delta",
    "**Đặc tính tại Đồng bằng sông Cửu Long:** trong điều kiện cấy có thời gian sinh trưởng 97–103 ngày vụ Đông Xuân và 97–98 ngày vụ Hè Thu (nếu sạ thẳng sẽ rút ngắn 3–5 ngày). Chiều cao cây 96,7–102,8 cm, khả năng đẻ nhánh khá, bông dài, 112–140 hạt chắc/bông. Khối lượng 1.000 hạt 25,3–26,3 g. Tỷ lệ gạo lật 78,3–79,4%.\n\nNăng suất trung bình vụ Đông Xuân **7,54–7,58 tấn/ha**, vụ Hè Thu **6,77–6,90 tấn/ha**.",
    "**In the Mekong Delta:** growth duration 97–103 days (winter–spring) and 97–98 days (summer–autumn) when transplanted; direct seeding shortens it by 3–5 days. Plant height 96.7–102.8 cm, good tillering, long panicles, 112–140 filled grains/panicle. 1,000-grain weight 25.3–26.3 g. Brown rice ratio 78.3–79.4%.\n\nAverage yield **7.54–7.58 t/ha** (winter–spring) and **6.77–6.90 t/ha** (summer–autumn).",
    DBSCL_STEPS,
  );
  const dhntb = await createProcess(
    "Duyên hải Nam Trung Bộ",
    "South Central Coast",
    "**Đặc tính tại Duyên hải Nam Trung Bộ:** thời gian sinh trưởng 109–118 ngày vụ Đông Xuân và 97–102 ngày vụ Hè Thu (nếu gieo sạ, rút ngắn 3–5 ngày). Chiều cao cây 89,4–108,6 cm, khả năng đẻ nhánh khá, bông dài, 104,6–117,5 hạt chắc/bông. Khối lượng 1.000 hạt 23,7–24,9 g. Tỷ lệ gạo lật 77,59–79,19%.\n\nNăng suất trung bình vụ Đông Xuân **67,6–68,0 tạ/ha**, vụ Hè Thu **64,7–67,8 tạ/ha**.",
    "**In the South Central Coast:** growth duration 109–118 days (winter–spring) and 97–102 days (summer–autumn); direct seeding shortens it by 3–5 days. Plant height 89.4–108.6 cm, good tillering, long panicles, 104.6–117.5 filled grains/panicle. 1,000-grain weight 23.7–24.9 g. Brown rice ratio 77.59–79.19%.\n\nAverage yield **6.76–6.80 t/ha** (winter–spring) and **6.47–6.78 t/ha** (summer–autumn).",
    DHNTB_STEPS,
  );

  // Lô giống (dữ liệu mẫu): SNC -> NC -> XN1
  const lot = (code: string, cls: string, date: string, producer: string, kg: number, germ: number, pur: number, moist: number, test: string, parent: string | null) =>
    db.query(
      `INSERT INTO lots (code, variety_id, seed_class, production_date, producer, quantity_kg, germination, purity, moisture, test_date, parent_code, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Dữ liệu mẫu để chạy thử')`,
      [code, varietyId, cls, date, producer, kg, germ, pur, moist, test, parent],
    );
  await lot("VNR98-SNC-2025-01", "Siêu nguyên chủng", "2025-04-20", "Trung tâm nghiên cứu giống (mẫu)", 500, 92, 99.9, 12.5, "2025-05-05", null);
  await lot("VNR98-NC-2025-07", "Nguyên chủng", "2025-09-10", "Trại sản xuất giống (mẫu)", 8000, 91, 99.5, 13, "2025-09-25", "VNR98-SNC-2025-01");
  await lot("VNR98-XN1-2026-03", "Xác nhận 1", "2026-03-15", "Nhà máy chế biến giống (mẫu)", 120000, 90, 99.0, 13.2, "2026-03-28", "VNR98-NC-2025-07");

  // Mô hình
  const riceTemplate = (values: Record<string, any>) => JSON.stringify(withIds(RICE_TEMPLATE, values));
  const model = async (m: Record<string, any>) => {
    const cols = Object.keys(m);
    const [{ id }] = await db.query(
      `INSERT INTO models (${cols.join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
      Object.values(m),
    );
    return id as number;
  };
  const growth =
    "Cây sinh trưởng khỏe, đẻ nhánh khá, bộ lá gọn, bông dài, hạt xếp xít. Thời gian sinh trưởng tương đương mô tả của giống tại vùng.";

  const m2 = await model({
    code: "MH-2026-002",
    variety_id: varietyId,
    process_id: dbscl.id,
    lot_code: "VNR98-XN1-2026-03",
    season: "Thu Đông 2026",
    year: 2026,
    province: "Đồng Tháp",
    commune: "Xã Tân Phú",
    address: "Ấp 3",
    area_ha: 2.5,
    farmer_name: "Hộ ông Nguyễn Văn A (mẫu)",
    staff_name: "Cán bộ kinh doanh (mẫu)",
    staff_phone: "0900000002",
    sow_date: "2026-08-25",
    heading_date: "2026-11-01",
    harvest_date: "2026-12-01",
    yield_expected: 7.2,
    status: "active",
    summary: "Mô hình trình diễn giống lúa VNR98 vụ Thu Đông theo quy trình sạ hàng. (Dữ liệu mẫu để chạy thử)",
    created_by: editorId,
    fields: riceTemplate({
      "Đặc tính sinh trưởng": growth,
      "Khả năng chống đổ": "Tốt",
      "Khả năng chống chịu sâu bệnh": "Đến nay chưa ghi nhận sâu bệnh gây hại đáng kể; có rầy nâu mật độ thấp ở bờ ruộng.",
      "Chiều cao cây": 98,
      "Nhận xét của chủ ruộng": [
        { name: "Ông Trần Văn B (mẫu)", place: "Đồng Tháp", season: "Hè Thu 2026", rating: 5, content: "Cây cứng, ít đổ ngã, hạt đẹp, thương lái thu mua giá tốt." },
        { name: "Bà Lê Thị C (mẫu)", place: "Đồng Tháp", season: "Đông Xuân 2025–2026", rating: 4, content: "Đẻ nhánh khá, bông dài. Cần chú ý phòng bệnh khi lúa trỗ." },
      ],
    }),
  });
  const m1 = await model({
    code: "MH-2026-001",
    variety_id: varietyId,
    process_id: dbscl.id,
    lot_code: "VNR98-XN1-2026-03",
    season: "Hè Thu 2026",
    year: 2026,
    province: "Cần Thơ",
    commune: "Xã Thạnh Phú",
    area_ha: 3,
    farmer_name: "Hợp tác xã nông nghiệp (mẫu)",
    staff_name: "Cán bộ Marketing (mẫu)",
    staff_phone: "0900000001",
    sow_date: "2026-05-20",
    heading_date: "2026-07-26",
    harvest_date: "2026-08-25",
    yield_expected: 6.8,
    yield_actual: 6.92,
    status: "harvested",
    summary: "Mô hình vụ Hè Thu 2026 đã thu hoạch, năng suất thực tế vượt dự kiến. (Dữ liệu mẫu để chạy thử)",
    created_by: editorId,
    fields: riceTemplate({
      "Đặc tính sinh trưởng": growth,
      "Khả năng chống đổ": "Tốt",
      "Chiều cao cây": 100,
      "Nhận xét của chủ ruộng": [
        { name: "Đại diện HTX (mẫu)", place: "Cần Thơ", season: "Hè Thu 2026", rating: 5, content: "Năng suất cao hơn giống đang trồng, lúa chín đều, dễ thu hoạch bằng máy." },
      ],
    }),
  });
  const m3 = await model({
    code: "MH-2026-003",
    variety_id: varietyId,
    process_id: dhntb.id,
    lot_code: "VNR98-XN1-2026-03",
    season: "Hè Thu 2026",
    year: 2026,
    province: "Quảng Ngãi",
    commune: "Xã Nghĩa Hành",
    area_ha: 1.5,
    farmer_name: "Hộ ông Phạm Văn D (mẫu)",
    staff_name: "Cán bộ kinh doanh (mẫu)",
    staff_phone: "0900000002",
    sow_date: "2026-05-28",
    heading_date: "2026-08-02",
    harvest_date: "2026-09-05",
    yield_expected: 6.5,
    yield_actual: 6.7,
    status: "harvested",
    summary: "Mô hình vụ Hè Thu 2026 vùng Duyên hải Nam Trung Bộ, sạ hàng trên luống. (Dữ liệu mẫu để chạy thử)",
    created_by: editorId,
    fields: riceTemplate({ "Đặc tính sinh trưởng": growth, "Khả năng chống đổ": "Khá", "Chiều cao cây": 95 }),
  });
  for (const mid of [m1, m2, m3]) await db.query(`INSERT INTO model_assignees VALUES ($1,$2)`, [mid, salesId]);

  // Nhật ký
  const diary = (model_id: number, step: number | undefined, date: string, content: string, compliance = "ok", author = salesId) =>
    db.query(
      `INSERT INTO diary_entries (model_id, step_id, entry_date, content, compliance, author_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [model_id, step ?? null, date, content, compliance, author],
    );
  const s = dbscl.steps;
  await diary(m2, s["Làm đất"], "2026-08-15", "Xới trục, trang khỏa mặt bằng, đào rãnh thoát nước. Cho nước ngâm 3 đêm, phun thuốc ốc bươu vàng.");
  await diary(m2, s["Lượng giống và ngâm ủ"], "2026-08-22", "Ngâm 24 giờ, rửa giống 2 lần lúc 12 giờ và 24 giờ; ủ 30 giờ. Lượng giống 100 kg/ha.");
  await diary(m2, s["Bón lót"], "2026-08-24", "Bón lót 50 kg DAP/ha.");
  await diary(m2, s["Sạ giống"], "2026-08-25", "Sạ hàng bằng máy lỗ 8 mm khi hạt nứt nanh đều. Tháo cạn nước từ đêm trước.");
  await diary(m2, s["Chăm sóc sau sạ, quản lý nước"], "2026-08-28", "Phun thuốc trừ cỏ; giữ đất ẩm, chưa cho nước vào ruộng.");
  await diary(m2, s["Bón thúc lần 1"], "2026-09-03", "Bón 50 kg DAP + 40 kg Urê + 20 kg KCl/ha (9 ngày sau sạ).");
  await diary(m2, s["Bón thúc lần 2"], "2026-09-17", "Tỉa dặm chậm 3 ngày do mưa lớn. Lúa xanh tốt nên giảm Urê còn 50 kg/ha; DAP và KCl đúng quy trình.", "adjusted");
  await diary(m2, s["Bón đón đòng"], "2026-10-06", "Đòng dài khoảng 3 mm. Bón 40 kg Urê + 30 kg KCl/ha.");
  await diary(m2, s["Phòng trừ dịch hại"], "2026-10-15", "Phát hiện rầy nâu mật độ thấp ở bờ ruộng, tiếp tục theo dõi, chưa phun thuốc.", "none");
  await diary(m2, undefined, "2026-10-20", "Đón đoàn đại lý tham quan ruộng mô hình.", "none", editorId);

  await diary(m1, s["Sạ giống"], "2026-05-20", "Sạ hàng, lượng giống 100 kg/ha.");
  await diary(m1, s["Bón thúc lần 1"], "2026-05-29", "Bón thúc 1 đúng liều lượng quy trình.");
  await diary(m1, s["Bón đón đòng"], "2026-07-01", "Bón đón đòng đúng quy trình.");
  await diary(m1, s["Thu hoạch"], "2026-08-25", "Thu hoạch bằng máy gặt đập liên hợp. Năng suất thực tế 6,92 tấn/ha.");

  const t = dhntb.steps;
  await diary(m3, t["Làm đất, lên luống"], "2026-05-20", "Lên luống rộng 1,4 m, cao khoảng 12 cm, băng 30 cm.");
  await diary(m3, t["Sạ giống"], "2026-05-28", "Sạ hàng 65 kg/ha.");
  await diary(m3, t["Bón thúc lần 1"], "2026-06-10", "Bón 3,5 kg Urê + 3,5 kg Kali/sào.");
  await diary(m3, t["Bón đón đòng"], "2026-07-20", "Vụ Hè Thu: giảm 10% đạm, tăng 15% kali theo lưu ý quy trình.", "adjusted");
  await diary(m3, t["Thu hoạch"], "2026-09-05", "Thu hoạch khi lúa chín 92%. Năng suất thực tế 6,7 tấn/ha.");

  // Lượt quét mẫu cho thống kê
  await db.query(
    `INSERT INTO scans (model_id, source, created_at)
     SELECT $1, 'qr', now() - (random() * interval '30 days') FROM generate_series(1, 42)`,
    [m2],
  );
  console.log("Đã tạo dữ liệu mẫu: giống VNR98, 2 quy trình, 3 lô, 3 mô hình, 2 tài khoản mẫu.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
