import type { CustomField, FieldType } from "./types";

export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "text", label: "Văn bản ngắn" },
  { type: "textarea", label: "Đoạn văn" },
  { type: "number", label: "Số (có đơn vị)" },
  { type: "date", label: "Ngày" },
  { type: "select", label: "Danh sách lựa chọn" },
  { type: "image", label: "Ảnh" },
  { type: "testimonials", label: "Nhận xét chủ ruộng" },
];

export const fieldTypeLabel = (t: FieldType) => FIELD_TYPES.find((f) => f.type === t)?.label || t;

export const newFieldId = () => "f_" + Math.random().toString(36).slice(2, 10);

// Kiểm tra trường có giá trị để hiển thị trên trang công khai
export function hasValue(f: CustomField) {
  if (f.type === "testimonials") return Array.isArray(f.value) && f.value.length > 0;
  if (f.type === "image") return !!f.value?.key;
  return f.value !== undefined && f.value !== null && String(f.value).trim() !== "";
}

// Làm sạch dữ liệu trường gửi lên từ form quản trị
export function sanitizeFields(raw: unknown): CustomField[] {
  if (!Array.isArray(raw)) return [];
  const types = new Set(FIELD_TYPES.map((t) => t.type));
  return raw
    .filter((f: any) => f && typeof f.label === "string" && f.label.trim() && types.has(f.type))
    .map((f: any) => ({
      id: typeof f.id === "string" && f.id ? f.id : newFieldId(),
      type: f.type,
      label: String(f.label).trim().slice(0, 200),
      label_en: f.label_en ? String(f.label_en).slice(0, 200) : undefined,
      unit: f.unit ? String(f.unit).slice(0, 40) : undefined,
      options: Array.isArray(f.options) ? f.options.map(String).filter(Boolean).slice(0, 50) : undefined,
      value: f.value,
      value_en: f.value_en ? String(f.value_en) : undefined,
    }));
}
