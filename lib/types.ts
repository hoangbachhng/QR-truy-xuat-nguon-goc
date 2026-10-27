export type Role = "admin" | "editor" | "reporter";
export type Crop = "lua" | "ngo";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  active: boolean;
}

export interface Spec {
  label: string;
  label_en?: string;
  value: string;
  value_en?: string;
}

export interface Variety {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  crop: Crop;
  origin: string | null;
  origin_en: string | null;
  characteristics: string | null;
  characteristics_en: string | null;
  specs: Spec[];
  growth_days: number | null;
}

export interface ImageItem {
  key: string;
  caption?: string;
  caption_en?: string;
}

export interface Material {
  item: string;
  dose: string;
  note?: string;
}

export interface Process {
  id: number;
  variety_id: number;
  region: string;
  region_en: string | null;
  title: string;
  title_en: string | null;
  version: number;
  intro: string | null;
  intro_en: string | null;
  source_file: string | null;
  source_name: string | null;
  status: "draft" | "published" | "archived";
}

export interface ProcessStep {
  id: number;
  process_id: number;
  position: number;
  stage: string | null;
  title: string;
  title_en: string | null;
  day_from: number | null;
  day_to: number | null;
  timing_note: string | null;
  timing_note_en: string | null;
  content: string | null;
  content_en: string | null;
  materials: Material[];
  images: ImageItem[];
  warning: string | null;
  warning_en: string | null;
}

export interface Lot {
  id: number;
  code: string;
  variety_id: number | null;
  seed_class: string | null;
  production_date: string | null;
  producer: string | null;
  quantity_kg: number | null;
  germination: number | null;
  purity: number | null;
  moisture: number | null;
  test_date: string | null;
  cert_file: string | null;
  cert_name: string | null;
  parent_code: string | null;
  notes: string | null;
  source: "manual" | "wms";
  external_id: string | null;
  synced_at: string | null;
  extra: Record<string, unknown>;
}

// Trường tùy chỉnh kiểu Google Form
export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "image" | "testimonials";

export interface Testimonial {
  name: string;
  place?: string;
  season?: string;
  rating?: number;
  content: string;
  content_en?: string;
  image?: string;
}

export interface CustomField {
  id: string;
  type: FieldType;
  label: string;
  label_en?: string;
  unit?: string;
  options?: string[];
  value?: any; // string | number | Testimonial[] | ImageItem
  value_en?: string;
}

export interface Model {
  id: number;
  code: string;
  variety_id: number;
  process_id: number | null;
  lot_code: string | null;
  season: string | null;
  year: number | null;
  province: string | null;
  district: string | null;
  commune: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  area_ha: number | null;
  farmer_name: string | null;
  staff_name: string | null;
  staff_phone: string | null;
  sow_date: string | null;
  heading_date: string | null;
  harvest_date: string | null;
  yield_expected: number | null;
  yield_actual: number | null;
  status: "active" | "harvested" | "closed";
  cover_image: string | null;
  summary: string | null;
  summary_en: string | null;
  fields: CustomField[];
  published: boolean;
}

export interface DiaryEntry {
  id: number;
  model_id: number;
  step_id: number | null;
  entry_date: string;
  title: string | null;
  content: string | null;
  content_en: string | null;
  compliance: "ok" | "adjusted" | "none";
  images: ImageItem[];
  author_id: number | null;
  author_name?: string | null;
  approved: boolean;
}
