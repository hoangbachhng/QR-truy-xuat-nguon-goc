# Website QR mô hình trình diễn – Vinaseed

Mỗi mô hình trình diễn có **một mã QR riêng** in trên biển cắm ruộng. Quét QR mở trang công khai gồm:

- **Tổng quan**: 4 thông tin bắt buộc (ngày gieo, ngày trỗ, dự kiến thu hoạch, năng suất dự kiến), các trường tùy chỉnh kiểu Google Form, nhận xét của chủ ruộng, thông tin giống, liên hệ cán bộ phụ trách.
- **Quy trình và nhật ký**: quy trình kỹ thuật chuẩn (có sơ đồ minh họa) đặt cạnh nhật ký thực tế của mô hình, từng bước được ghép cặp và gắn nhãn *Đúng quy trình* / *Có điều chỉnh*.
- **Lô giống**: thông tin lô, kiểm nghiệm, phiếu kiểm nghiệm, hành trình SNC → NC → XN.

Trang quản trị dùng được trên cả điện thoại (ghi nhật ký nhanh, chụp ảnh ngoài đồng) và máy tính (soạn quy trình, quản lý mô hình).

## Chạy thử trên máy

Cần Node.js 20 trở lên.

```bash
npm install
cp .env.example .env.local   # điền AUTH_SECRET, ADMIN_PASSWORD, SEED_PASSWORD
npm run seed                 # tạo dữ liệu mẫu VNR98
npm run dev                  # mở http://localhost:3000
```

Khi `DATABASE_URL` để trống, website dùng **PostgreSQL nhúng (PGlite)**, lưu tại `./data/pglite`, nên không cần cài PostgreSQL. Chỉ dùng chế độ này để chạy thử.

- Trang công khai: `http://localhost:3000/m/MH-2026-002`
- Quản trị: `http://localhost:3000/admin`. Tài khoản quản trị lấy từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env.local`; 2 tài khoản mẫu (`marketing@vinaseed.local`, `kinhdoanh@vinaseed.local`) dùng `SEED_PASSWORD`.
- `npm run seed -- --reset`: xóa sạch rồi tạo lại dữ liệu mẫu (tắt `npm run dev` trước khi chạy).

## Nguyên tắc triển khai: một mã nguồn, chạy mọi nơi

Không dùng dịch vụ riêng của bất kỳ nền tảng nào. Ba nơi chạy chỉ khác nhau ở **biến môi trường**:

| Thành phần | Vercel / Netlify (demo) | Server Vinaseed |
|---|---|---|
| Ứng dụng | Tự build từ mã nguồn | `docker compose up -d --build` (hoặc `node .next/standalone/server.js`) |
| CSDL | PostgreSQL trên mạng (Neon, Supabase...) qua `DATABASE_URL` | PostgreSQL trong docker-compose |
| Ảnh, tài liệu | `STORAGE_DRIVER=s3` (Cloudflare R2, AWS S3...) vì Vercel/Netlify không lưu file lâu dài | `STORAGE_DRIVER=local`, lưu trong volume |
| Tên miền | `PUBLIC_BASE_URL` | `PUBLIC_BASE_URL` |

Website tự tạo bảng CSDL khi khởi động lần đầu, và tự tạo tài khoản quản trị từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` nếu CSDL chưa có người dùng.

### Tên miền và mã QR

Mã QR chứa địa chỉ `PUBLIC_BASE_URL/m/<mã mô hình>`. **Chốt một tên miền cố định trước khi in biển** (ví dụ `mohinh.vinaseed.com.vn`):

- Giai đoạn demo: trỏ tên miền về Vercel/Netlify.
- Khi chuyển về server Vinaseed: trỏ DNS sang server. Mã QR đã in vẫn dùng được, không phải in lại.

### Vercel

1. Import repository vào Vercel (tự nhận diện Next.js, không cần cấu hình thêm).
2. Khai báo biến: `PUBLIC_BASE_URL`, `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STORAGE_DRIVER=s3`, `S3_*`.
3. Lưu ý: Vercel giới hạn mỗi lần tải file khoảng 4,5 MB. Ảnh chụp đã được tự thu nhỏ trên điện thoại; PDF lớn hơn mức này cần nén trước khi tải.

### Netlify

Đã có `netlify.toml`. Khai báo các biến giống Vercel trong *Site settings → Environment variables*.

### Server Vinaseed (Docker)

```bash
cp .env.example .env      # điền PUBLIC_BASE_URL, AUTH_SECRET, ADMIN_*, POSTGRES_PASSWORD
docker compose up -d --build
```

Website chạy ở cổng 3000. Bộ phận IT cấu hình Nginx/IIS (HTTPS) chuyển tiếp về cổng này. Dữ liệu nằm ở 2 volume `pgdata` (CSDL) và `uploads` (ảnh, PDF); cần sao lưu định kỳ cả hai.

**Không dùng Docker:** cài Node.js 22 và PostgreSQL, chạy `npm ci && npm run build`, sao chép `public/` và `.next/static/` vào `.next/standalone/`, rồi chạy `node .next/standalone/server.js` (dùng PM2 hoặc dịch vụ Windows để tự khởi động lại).

**Chuyển dữ liệu từ bản demo sang server:** dùng `pg_dump` từ CSDL demo rồi `psql` vào CSDL server; tải toàn bộ bucket S3 về thư mục `uploads` (giữ nguyên cấu trúc thư mục).

## Thương hiệu

- Logo: `public/brand/` (chuyển từ file `Logo chuẩn CMYK.ai`). Trang hướng tới nông dân dùng **mô hình thương hiệu độc lập** (không kèm câu bảo trợ), theo Brand Guideline trang 20.
- Màu: khai báo trong `app/globals.css` theo Brand Guideline trang 15.
- Font **UTM Neo Sans Intel**: đặt file vào `public/fonts/` với tên `UTMNeoSansIntel.woff2` (Regular) và `UTMNeoSansIntelBold.woff2` (Bold), hoặc `.ttf`. Khi chưa có file, website dùng font dự phòng.

## Phân quyền

| Vai trò | Dành cho | Quyền |
|---|---|---|
| Quản trị hệ thống | ĐMST&CĐS (sau bàn giao cho Marketing) | Toàn quyền, tài khoản, khóa API, cài đặt |
| Biên tập | Cán bộ Marketing | Mô hình, quy trình, giống, lô, mẫu trường, duyệt nhật ký |
| Ghi nhật ký | Cán bộ kinh doanh | Chỉ ghi/sửa nhật ký của mô hình được giao |

**Bàn giao quản trị:** tạo tài khoản *Quản trị hệ thống* cho người nhận, người nhận đăng nhập, rồi khóa tài khoản cũ. Không cần sửa mã nguồn.

## Lô giống: 2 giai đoạn

1. **Hiện tại:** nhập tay hoặc nhập Excel (Quản trị → Lô giống → Tải file Excel mẫu).
2. **Khi có phần mềm kho:** tạo khóa API (Quản trị → Cài đặt, API) và gửi tài liệu [`docs/api-lo-giong.md`](docs/api-lo-giong.md) cho đơn vị phần mềm. Mô hình chỉ lưu mã lô, nên đổi nguồn dữ liệu không ảnh hưởng mô hình hay QR đã in.

## Cấu trúc mã nguồn

```
app/m/[code]        Trang công khai khi quét QR
app/admin           Trang quản trị (đăng nhập, mô hình, nhật ký, quy trình, giống, lô, mẫu trường, người dùng, cài đặt)
app/api/v1/lots     API cho phần mềm kho
app/api/qr          Sinh ảnh QR (PNG/SVG)
app/files           Phục vụ ảnh/tài liệu (ổ đĩa hoặc S3)
lib/db.ts           Kết nối CSDL (PostgreSQL hoặc PGlite)
lib/migrations.ts   Cấu trúc bảng
lib/storage.ts      Lưu file (local hoặc S3)
scripts/seed.ts     Dữ liệu mẫu VNR98
seed/assets         Sơ đồ minh họa mẫu (sinh bằng scripts/gen-diagrams.mjs)
```
