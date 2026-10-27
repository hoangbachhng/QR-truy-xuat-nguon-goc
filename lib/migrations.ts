// Các bước tạo/sửa cấu trúc CSDL. Chỉ THÊM bước mới vào cuối mảng, không sửa bước đã chạy.
// SQL chuẩn PostgreSQL, chạy giống nhau trên PostgreSQL thật (Neon, server Vinaseed) và PGlite.
export const migrations: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "khoi-tao",
    sql: `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','editor','reporter')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE varieties (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  crop TEXT NOT NULL CHECK (crop IN ('lua','ngo')),
  origin TEXT,
  origin_en TEXT,
  characteristics TEXT,
  characteristics_en TEXT,
  specs JSONB NOT NULL DEFAULT '[]',
  growth_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE processes (
  id SERIAL PRIMARY KEY,
  variety_id INT NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  region_en TEXT,
  title TEXT NOT NULL,
  title_en TEXT,
  version INT NOT NULL DEFAULT 1,
  intro TEXT,
  intro_en TEXT,
  source_file TEXT,
  source_name TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE process_steps (
  id SERIAL PRIMARY KEY,
  process_id INT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  stage TEXT,
  title TEXT NOT NULL,
  title_en TEXT,
  day_from INT,
  day_to INT,
  timing_note TEXT,
  timing_note_en TEXT,
  content TEXT,
  content_en TEXT,
  materials JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  warning TEXT,
  warning_en TEXT
);
CREATE INDEX process_steps_process_idx ON process_steps(process_id, position);

CREATE TABLE lots (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  variety_id INT REFERENCES varieties(id) ON DELETE SET NULL,
  seed_class TEXT,
  production_date DATE,
  producer TEXT,
  quantity_kg NUMERIC,
  germination NUMERIC,
  purity NUMERIC,
  moisture NUMERIC,
  test_date DATE,
  cert_file TEXT,
  cert_name TEXT,
  parent_code TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','wms')),
  external_id TEXT,
  synced_at TIMESTAMPTZ,
  extra JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE field_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  crop TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE models (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  variety_id INT NOT NULL REFERENCES varieties(id),
  process_id INT REFERENCES processes(id) ON DELETE SET NULL,
  lot_code TEXT,
  season TEXT,
  year INT,
  province TEXT,
  district TEXT,
  commune TEXT,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  area_ha NUMERIC,
  farmer_name TEXT,
  staff_name TEXT,
  staff_phone TEXT,
  sow_date DATE,
  heading_date DATE,
  harvest_date DATE,
  yield_expected NUMERIC,
  yield_actual NUMERIC,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','harvested','closed')),
  cover_image TEXT,
  summary TEXT,
  summary_en TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX models_year_idx ON models(year);

CREATE TABLE model_assignees (
  model_id INT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (model_id, user_id)
);

CREATE TABLE diary_entries (
  id SERIAL PRIMARY KEY,
  model_id INT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  step_id INT REFERENCES process_steps(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  title TEXT,
  content TEXT,
  content_en TEXT,
  compliance TEXT NOT NULL DEFAULT 'none' CHECK (compliance IN ('ok','adjusted','none')),
  images JSONB NOT NULL DEFAULT '[]',
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX diary_model_idx ON diary_entries(model_id, entry_date);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scans (
  id BIGSERIAL PRIMARY KEY,
  model_id INT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scans_model_idx ON scans(model_id, created_at);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
  },
];
