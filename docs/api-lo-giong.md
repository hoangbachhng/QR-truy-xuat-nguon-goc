# API lô giống – tài liệu cho đơn vị phát triển phần mềm kho

Website mô hình trình diễn nhận dữ liệu lô giống từ phần mềm kho qua REST API. Lô nhận qua API được đánh dấu **nguồn: phần mềm kho** và bị khóa sửa trên website (chỉ bổ sung được phiếu kiểm nghiệm, ghi chú).

## Xác thực

Quản trị viên website tạo khóa tại **Quản trị → Cài đặt, API → Tạo khóa mới**, rồi gửi khóa cho đơn vị phần mềm kho. Mọi yêu cầu gửi kèm header:

```
Authorization: Bearer vsk_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

## 1. Gửi / cập nhật lô

`POST {PUBLIC_BASE_URL}/api/v1/lots`

Gửi một lô, hoặc nhiều lô (tối đa 500/lần) trong mảng `lots`. Lô đã có cùng `code` sẽ được cập nhật.

```json
{
  "lots": [
    {
      "code": "VNR98-XN1-2026-03",
      "variety_code": "VNR98",
      "seed_class": "Xác nhận 1",
      "production_date": "2026-03-15",
      "producer": "Nhà máy chế biến giống ...",
      "quantity_kg": 120000,
      "germination": 90,
      "purity": 99.0,
      "moisture": 13.2,
      "test_date": "2026-03-28",
      "parent_code": "VNR98-NC-2025-07",
      "external_id": "WMS-LOT-000123",
      "extra": { "kho": "Kho Hà Nam", "so_phieu_nhap": "PN-0456" }
    }
  ]
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `code` | chuỗi | Có | Mã lô, duy nhất. Đây là mã cán bộ nhập vào mô hình. |
| `variety_code` | chuỗi | | Phải trùng mã giống đã khai báo trên website (ví dụ `VNR98`). |
| `seed_class` | chuỗi | | Siêu nguyên chủng / Nguyên chủng / Xác nhận 1 / F1 ... |
| `production_date`, `test_date` | ngày | | `YYYY-MM-DD` hoặc `DD/MM/YYYY` |
| `producer` | chuỗi | | Cơ sở sản xuất |
| `quantity_kg`, `germination`, `purity`, `moisture` | số | | % dùng số thập phân, ví dụ `99.5` |
| `parent_code` | chuỗi | | Mã lô mẹ, để dựng hành trình SNC → NC → XN |
| `external_id` | chuỗi | | Mã định danh trong phần mềm kho |
| `extra` | object | | Dữ liệu bổ sung tùy ý, lưu nguyên dạng JSON |

Phản hồi `200` (hoặc `207` nếu có dòng lỗi):

```json
{ "created": 1, "updated": 0, "errors": [] }
```

## 2. Đọc lô

- `GET /api/v1/lots/{code}`: thông tin một lô
- `GET /api/v1/lots?updated_since=2026-01-01T00:00:00Z`: danh sách lô thay đổi từ thời điểm (tối đa 500)

## Mã lỗi

| Mã | Ý nghĩa |
|---|---|
| 401 | Thiếu khóa, khóa sai hoặc đã bị thu hồi |
| 400 | Body không phải JSON |
| 413 | Quá 500 lô một lần |
| 207 | Một số lô lỗi, xem mảng `errors` |
