"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, one, q } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { bool, date, json, num, str } from "@/lib/form";
import { sanitizeFields } from "@/lib/fields";
import { getSetting, isAssigned, nextModelCode, setSetting } from "@/lib/repo";
import { slugCode } from "@/lib/format";
import type { ImageItem, Material, ProcessStep, Spec } from "@/lib/types";

const done = (path: string): never => {
  revalidatePath("/", "layout");
  redirect(path);
};
const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}err=${encodeURIComponent(msg)}`);
const cleanImages = (v: unknown): ImageItem[] =>
  Array.isArray(v) ? v.filter((x: any) => x && typeof x.key === "string").map((x: any) => ({ key: x.key, caption: x.caption || "", caption_en: x.caption_en || undefined })) : [];

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ============================================================ Mô hình
export async function saveModel(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const back = id ? `/admin/models/${id}` : "/admin/models/new";
  const variety_id = num(fd, "variety_id");
  const sow_date = date(fd, "sow_date");
  const heading_date = date(fd, "heading_date");
  const harvest_date = date(fd, "harvest_date");
  const yield_expected = num(fd, "yield_expected");
  if (!variety_id) fail(back, "Chưa chọn giống");
  if (!sow_date || !heading_date || !harvest_date || yield_expected == null)
    fail(back, "Bắt buộc nhập đủ: ngày gieo, ngày trỗ, dự kiến thu hoạch, năng suất dự kiến");
  if (harvest_date! <= sow_date!) fail(back, "Ngày thu hoạch phải sau ngày gieo");

  const process_id = num(fd, "process_id");
  if (process_id) {
    const p = await one<{ variety_id: number }>(`SELECT variety_id FROM processes WHERE id = $1`, [process_id]);
    if (p?.variety_id !== variety_id) fail(back, "Quy trình đã chọn không thuộc giống này");
  }
  const year = num(fd, "year") ?? Number(sow_date!.slice(0, 4));
  let code = slugCode(str(fd, "code") || "");
  if (!code) code = await nextModelCode(year);
  const dup = await one<{ id: number }>(`SELECT id FROM models WHERE upper(code) = $1 AND id <> $2`, [code, id ?? 0]);
  if (dup) fail(back, `Mã ${code} đã được dùng cho mô hình khác`);

  const cover = cleanImages(json(fd, "cover_image", []))[0]?.key ?? null;
  const data: Record<string, unknown> = {
    code,
    variety_id,
    process_id,
    lot_code: str(fd, "lot_code"),
    season: str(fd, "season"),
    year,
    province: str(fd, "province"),
    district: str(fd, "district"),
    commune: str(fd, "commune"),
    address: str(fd, "address"),
    lat: num(fd, "lat"),
    lng: num(fd, "lng"),
    area_ha: num(fd, "area_ha"),
    farmer_name: str(fd, "farmer_name"),
    staff_name: str(fd, "staff_name"),
    staff_phone: str(fd, "staff_phone"),
    sow_date,
    heading_date,
    harvest_date,
    yield_expected,
    yield_actual: num(fd, "yield_actual"),
    status: ["active", "harvested", "closed"].includes(String(fd.get("status"))) ? String(fd.get("status")) : "active",
    cover_image: cover,
    summary: str(fd, "summary"),
    summary_en: str(fd, "summary_en"),
    fields: JSON.stringify(sanitizeFields(json(fd, "fields", []))),
    published: bool(fd, "published"),
  };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  let modelId = id;
  if (id) {
    await q(`UPDATE models SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}, updated_at = now() WHERE id = $${cols.length + 1}`, [...vals, id]);
  } else {
    const r = await q<{ id: number }>(
      `INSERT INTO models (${cols.join(", ")}, created_by) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}, $${cols.length + 1}) RETURNING id`,
      [...vals, user.id],
    );
    modelId = r[0].id;
  }
  const assignees = fd.getAll("assignees").map(Number).filter(Boolean);
  await q(`DELETE FROM model_assignees WHERE model_id = $1`, [modelId]);
  for (const uid of assignees) await q(`INSERT INTO model_assignees (model_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [modelId, uid]);
  await audit(user.id, id ? "update" : "create", "model", modelId!, { code });
  done(`/admin/models/${modelId}?saved=1`);
}

export async function deleteModel(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const m = await one<{ code: string }>(`SELECT code FROM models WHERE id = $1`, [id]);
  await q(`DELETE FROM models WHERE id = $1`, [id]);
  await audit(user.id, "delete", "model", id!, m);
  done("/admin/models?deleted=1");
}

// ============================================================ Nhật ký
export async function saveDiary(fd: FormData) {
  const user = await requireUser("reporter");
  const id = num(fd, "id");
  const model_id = num(fd, "model_id");
  const back = id ? `/admin/diary/${id}` : `/admin/diary/new?model=${model_id ?? ""}`;
  if (!model_id) fail(back, "Chưa chọn mô hình");
  if (user.role === "reporter" && !(await isAssigned(model_id!, user.id))) fail(back, "Bạn chưa được giao mô hình này");
  const entry_date = date(fd, "entry_date");
  if (!entry_date) fail(back, "Chưa nhập ngày thực hiện");
  const content = str(fd, "content");
  const images = cleanImages(json(fd, "images", []));
  if (!content && !images.length) fail(back, "Nhập nội dung hoặc thêm ảnh");
  const step_id = num(fd, "step_id");
  if (step_id) {
    const ok = await one(`SELECT 1 FROM process_steps s JOIN models m ON m.process_id = s.process_id WHERE s.id = $1 AND m.id = $2`, [step_id, model_id]);
    if (!ok) fail(back, "Bước quy trình không thuộc mô hình này");
  }
  const compliance = ["ok", "adjusted", "none"].includes(String(fd.get("compliance"))) ? String(fd.get("compliance")) : "none";
  const needApproval = user.role === "reporter" && (await getSetting("require_diary_approval", false));
  const vals = [model_id, step_id, entry_date, str(fd, "title"), content, str(fd, "content_en"), compliance, JSON.stringify(images)];
  if (id) {
    const cur = await one<{ author_id: number }>(`SELECT author_id FROM diary_entries WHERE id = $1`, [id]);
    if (!cur) fail("/admin/diary", "Không tìm thấy nhật ký");
    if (user.role === "reporter" && cur!.author_id !== user.id) fail(back, "Bạn chỉ sửa được nhật ký của mình");
    await q(
      `UPDATE diary_entries SET model_id=$1, step_id=$2, entry_date=$3, title=$4, content=$5, content_en=$6, compliance=$7, images=$8,
       approved = CASE WHEN $9 THEN FALSE ELSE approved END, updated_at = now() WHERE id = $10`,
      [...vals, needApproval, id],
    );
    await audit(user.id, "update", "diary", id!);
  } else {
    const r = await q<{ id: number }>(
      `INSERT INTO diary_entries (model_id, step_id, entry_date, title, content, content_en, compliance, images, author_id, approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [...vals, user.id, !needApproval],
    );
    await audit(user.id, "create", "diary", r[0].id);
  }
  done(`/admin/diary?saved=${needApproval ? "pending" : "1"}&model=${model_id}`);
}

export async function deleteDiary(fd: FormData) {
  const user = await requireUser("reporter");
  const id = num(fd, "id");
  const cur = await one<{ author_id: number }>(`SELECT author_id FROM diary_entries WHERE id = $1`, [id]);
  if (cur && (user.role !== "reporter" || cur.author_id === user.id)) {
    await q(`DELETE FROM diary_entries WHERE id = $1`, [id]);
    await audit(user.id, "delete", "diary", id!);
  }
  done("/admin/diary?deleted=1");
}

export async function approveDiary(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  await q(`UPDATE diary_entries SET approved = TRUE WHERE id = $1`, [id]);
  await audit(user.id, "approve", "diary", id!);
  done("/admin/diary?approved=1");
}

// ============================================================ Giống
export async function saveVariety(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const back = `/admin/varieties/${id ?? "new"}`;
  const code = slugCode(str(fd, "code") || "");
  const name = str(fd, "name");
  if (!code || !name) fail(back, "Nhập mã giống và tên giống");
  const crop = fd.get("crop") === "ngo" ? "ngo" : "lua";
  const specs = json<Spec[]>(fd, "specs", []).map((s) => ({ label: s.label, value: s.value, label_en: s.label_en || undefined, value_en: s.value_en || undefined }));
  const vals = [code, name, str(fd, "name_en"), crop, str(fd, "origin"), str(fd, "origin_en"), str(fd, "characteristics"), str(fd, "characteristics_en"), JSON.stringify(specs), num(fd, "growth_days")];
  const dup = await one(`SELECT 1 FROM varieties WHERE code = $1 AND id <> $2`, [code, id ?? 0]);
  if (dup) fail(back, `Mã giống ${code} đã tồn tại`);
  let vid = id;
  if (id) {
    await q(
      `UPDATE varieties SET code=$1, name=$2, name_en=$3, crop=$4, origin=$5, origin_en=$6, characteristics=$7, characteristics_en=$8, specs=$9, growth_days=$10 WHERE id=$11`,
      [...vals, id],
    );
  } else {
    vid = (
      await q<{ id: number }>(
        `INSERT INTO varieties (code, name, name_en, crop, origin, origin_en, characteristics, characteristics_en, specs, growth_days) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        vals,
      )
    )[0].id;
  }
  await audit(user.id, id ? "update" : "create", "variety", vid!, { code });
  done(`/admin/varieties/${vid}?saved=1`);
}

export async function deleteVariety(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const used = await one(`SELECT 1 FROM models WHERE variety_id = $1 LIMIT 1`, [id]);
  if (used) fail(`/admin/varieties/${id}`, "Giống đang được dùng trong mô hình, không xóa được");
  await q(`DELETE FROM varieties WHERE id = $1`, [id]);
  await audit(user.id, "delete", "variety", id!);
  done("/admin/varieties?deleted=1");
}

// ============================================================ Quy trình kỹ thuật
export async function createProcess(fd: FormData) {
  const user = await requireUser("editor");
  const variety_id = num(fd, "variety_id");
  const region = str(fd, "region");
  if (!variety_id || !region) fail("/admin/processes", "Chọn giống và nhập vùng áp dụng");
  const v = await one<{ code: string; name: string }>(`SELECT code, name FROM varieties WHERE id = $1`, [variety_id]);
  const r = await q<{ id: number }>(`INSERT INTO processes (variety_id, region, title, status) VALUES ($1, $2, $3, 'draft') RETURNING id`, [
    variety_id,
    region,
    `Quy trình canh tác giống ${v?.code} – ${region}`,
  ]);
  await audit(user.id, "create", "process", r[0].id);
  done(`/admin/processes/${r[0].id}`);
}

export async function saveProcess(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id")!;
  const back = `/admin/processes/${id}`;
  const title = str(fd, "title");
  const region = str(fd, "region");
  if (!title || !region) fail(back, "Nhập tên quy trình và vùng áp dụng");
  const steps = json<Partial<ProcessStep>[]>(fd, "steps", []);
  if (steps.some((s) => !String(s.title || "").trim())) fail(back, "Có bước chưa đặt tên");
  const status = ["draft", "published", "archived"].includes(String(fd.get("status"))) ? String(fd.get("status")) : "draft";
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE processes SET title=$1, title_en=$2, region=$3, region_en=$4, intro=$5, intro_en=$6, source_file=$7, source_name=$8, status=$9, updated_at=now() WHERE id=$10`,
      [title, str(fd, "title_en"), region, str(fd, "region_en"), str(fd, "intro"), str(fd, "intro_en"), str(fd, "source_file"), str(fd, "source_file_name"), status, id],
    );
    const existing = new Set((await tx.query<{ id: number }>(`SELECT id FROM process_steps WHERE process_id = $1`, [id])).map((r) => r.id));
    const keep = new Set<number>();
    for (const [i, s] of steps.entries()) {
      const vals = [
        i + 1,
        s.stage || null,
        String(s.title).trim(),
        s.title_en || null,
        Number.isFinite(s.day_from) ? s.day_from : null,
        Number.isFinite(s.day_to) ? s.day_to : null,
        s.timing_note || null,
        s.timing_note_en || null,
        s.content || null,
        s.content_en || null,
        JSON.stringify(((s.materials || []) as Material[]).filter((m) => m.item?.trim())),
        JSON.stringify(cleanImages(s.images)),
        s.warning || null,
        s.warning_en || null,
      ];
      if (s.id && existing.has(s.id)) {
        keep.add(s.id);
        await tx.query(
          `UPDATE process_steps SET position=$1, stage=$2, title=$3, title_en=$4, day_from=$5, day_to=$6, timing_note=$7, timing_note_en=$8,
           content=$9, content_en=$10, materials=$11, images=$12, warning=$13, warning_en=$14 WHERE id=$15`,
          [...vals, s.id],
        );
      } else {
        await tx.query(
          `INSERT INTO process_steps (position, stage, title, title_en, day_from, day_to, timing_note, timing_note_en, content, content_en, materials, images, warning, warning_en, process_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [...vals, id],
        );
      }
    }
    for (const old of existing) if (!keep.has(old)) await tx.query(`DELETE FROM process_steps WHERE id = $1`, [old]);
  });
  await audit(user.id, "update", "process", id, { steps: steps.length });
  done(`${back}?saved=1`);
}

// Tạo phiên bản mới: sao chép quy trình và các bước; mô hình cũ vẫn giữ phiên bản đã áp dụng.
export async function newProcessVersion(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id")!;
  const db = await getDb();
  const newId = await db.transaction(async (tx) => {
    const [p] = await tx.query<{ id: number }>(
      `INSERT INTO processes (variety_id, region, region_en, title, title_en, version, intro, intro_en, source_file, source_name, status)
       SELECT variety_id, region, region_en, title, title_en,
         (SELECT max(version) + 1 FROM processes p2 WHERE p2.variety_id = p.variety_id AND p2.region = p.region),
         intro, intro_en, source_file, source_name, 'draft'
       FROM processes p WHERE id = $1 RETURNING id`,
      [id],
    );
    await tx.query(
      `INSERT INTO process_steps (process_id, position, stage, title, title_en, day_from, day_to, timing_note, timing_note_en, content, content_en, materials, images, warning, warning_en)
       SELECT $2, position, stage, title, title_en, day_from, day_to, timing_note, timing_note_en, content, content_en, materials, images, warning, warning_en
       FROM process_steps WHERE process_id = $1 ORDER BY position`,
      [id, p.id],
    );
    return p.id;
  });
  await audit(user.id, "new_version", "process", newId, { from: id });
  done(`/admin/processes/${newId}?saved=version`);
}

export async function deleteProcess(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const used = await one(`SELECT 1 FROM models WHERE process_id = $1 LIMIT 1`, [id]);
  if (used) fail(`/admin/processes/${id}`, "Quy trình đang được mô hình sử dụng, hãy chuyển sang trạng thái Lưu trữ thay vì xóa");
  await q(`DELETE FROM processes WHERE id = $1`, [id]);
  await audit(user.id, "delete", "process", id!);
  done("/admin/processes?deleted=1");
}

// ============================================================ Lô giống
export async function saveLot(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const back = `/admin/lots/${id ?? "new"}`;
  const cur = id ? await one<{ source: string }>(`SELECT source FROM lots WHERE id = $1`, [id]) : undefined;
  if (cur?.source === "wms") {
    // Lô đồng bộ từ phần mềm kho: chỉ bổ sung phiếu kiểm nghiệm và ghi chú
    await q(`UPDATE lots SET cert_file=$1, cert_name=$2, notes=$3, updated_at=now() WHERE id=$4`, [str(fd, "cert_file"), str(fd, "cert_file_name"), str(fd, "notes"), id]);
    await audit(user.id, "update", "lot", id!);
    done(`${back}?saved=1`);
  }
  const code = str(fd, "code");
  if (!code) fail(back, "Nhập mã lô");
  const dup = await one(`SELECT 1 FROM lots WHERE code = $1 AND id <> $2`, [code, id ?? 0]);
  if (dup) fail(back, `Mã lô ${code} đã tồn tại`);
  const vals = [
    code,
    num(fd, "variety_id"),
    str(fd, "seed_class"),
    date(fd, "production_date"),
    str(fd, "producer"),
    num(fd, "quantity_kg"),
    num(fd, "germination"),
    num(fd, "purity"),
    num(fd, "moisture"),
    date(fd, "test_date"),
    str(fd, "cert_file"),
    str(fd, "cert_file_name"),
    str(fd, "parent_code"),
    str(fd, "notes"),
  ];
  let lid = id;
  if (id) {
    await q(
      `UPDATE lots SET code=$1, variety_id=$2, seed_class=$3, production_date=$4, producer=$5, quantity_kg=$6, germination=$7, purity=$8, moisture=$9,
       test_date=$10, cert_file=$11, cert_name=$12, parent_code=$13, notes=$14, updated_at=now() WHERE id=$15`,
      [...vals, id],
    );
  } else {
    lid = (
      await q<{ id: number }>(
        `INSERT INTO lots (code, variety_id, seed_class, production_date, producer, quantity_kg, germination, purity, moisture, test_date, cert_file, cert_name, parent_code, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        vals,
      )
    )[0].id;
  }
  await audit(user.id, id ? "update" : "create", "lot", lid!, { code });
  done(`/admin/lots/${lid}?saved=1`);
}

export async function deleteLot(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  await q(`DELETE FROM lots WHERE id = $1`, [id]);
  await audit(user.id, "delete", "lot", id!);
  done("/admin/lots?deleted=1");
}

export async function importLots(fd: FormData) {
  const user = await requireUser("editor");
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) fail("/admin/lots", "Chưa chọn file Excel");
  const { parseLotWorkbook, upsertLots } = await import("@/lib/lots");
  let rows;
  try {
    rows = await parseLotWorkbook(Buffer.from(await (file as File).arrayBuffer()));
  } catch (e: any) {
    fail("/admin/lots", "Không đọc được file Excel: " + e.message);
  }
  const res = await upsertLots(rows!, "manual");
  await audit(user.id, "import", "lot", undefined, res);
  done(`/admin/lots?imported=${res.created + res.updated}&skipped=${res.errors.length}`);
}

// ============================================================ Mẫu trường
export async function saveTemplate(fd: FormData) {
  const user = await requireUser("editor");
  const id = num(fd, "id");
  const name = str(fd, "name");
  if (!name) fail(`/admin/templates/${id ?? "new"}`, "Nhập tên mẫu");
  const fields = JSON.stringify(sanitizeFields(json(fd, "fields", [])).map((f) => ({ ...f, value: undefined, value_en: undefined })));
  const crop = ["lua", "ngo"].includes(String(fd.get("crop"))) ? String(fd.get("crop")) : null;
  let tid = id;
  if (id) await q(`UPDATE field_templates SET name=$1, crop=$2, fields=$3 WHERE id=$4`, [name, crop, fields, id]);
  else tid = (await q<{ id: number }>(`INSERT INTO field_templates (name, crop, fields) VALUES ($1,$2,$3) RETURNING id`, [name, crop, fields]))[0].id;
  await audit(user.id, id ? "update" : "create", "template", tid!);
  done(`/admin/templates/${tid}?saved=1`);
}

export async function deleteTemplate(fd: FormData) {
  await requireUser("editor");
  await q(`DELETE FROM field_templates WHERE id = $1`, [num(fd, "id")]);
  done("/admin/templates?deleted=1");
}

// ============================================================ Người dùng
export async function createUser(fd: FormData) {
  const admin = await requireUser("admin");
  const email = str(fd, "email")?.toLowerCase();
  const name = str(fd, "name");
  const password = str(fd, "password");
  const role = ["admin", "editor", "reporter"].includes(String(fd.get("role"))) ? String(fd.get("role")) : "reporter";
  if (!email || !name || !password) fail("/admin/users", "Nhập đủ email, họ tên, mật khẩu");
  if (password!.length < 8) fail("/admin/users", "Mật khẩu tối thiểu 8 ký tự");
  if (await one(`SELECT 1 FROM users WHERE email = $1`, [email])) fail("/admin/users", "Email đã tồn tại");
  const r = await q<{ id: number }>(`INSERT INTO users (email, name, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [
    email,
    name,
    str(fd, "phone"),
    await hashPassword(password!),
    role,
  ]);
  await audit(admin.id, "create", "user", r[0].id, { email, role });
  done("/admin/users?saved=1");
}

export async function updateUser(fd: FormData) {
  const admin = await requireUser("admin");
  const id = num(fd, "id")!;
  const role = ["admin", "editor", "reporter"].includes(String(fd.get("role"))) ? String(fd.get("role")) : "reporter";
  const active = bool(fd, "active");
  if (id === admin.id && (role !== "admin" || !active)) fail("/admin/users", "Không thể tự hạ quyền hoặc khóa tài khoản đang dùng");
  await q(`UPDATE users SET name=$1, phone=$2, role=$3, active=$4 WHERE id=$5`, [str(fd, "name"), str(fd, "phone"), role, active, id]);
  const pw = str(fd, "password");
  if (pw) {
    if (pw.length < 8) fail("/admin/users", "Mật khẩu tối thiểu 8 ký tự");
    await q(`UPDATE users SET password_hash = $1 WHERE id = $2`, [await hashPassword(pw), id]);
  }
  await audit(admin.id, "update", "user", id, { role, active, password_changed: !!pw });
  done("/admin/users?saved=1");
}

// ============================================================ Cài đặt, khóa API
export async function saveSettings(fd: FormData) {
  const admin = await requireUser("admin");
  await setSetting("require_diary_approval", bool(fd, "require_diary_approval"));
  await audit(admin.id, "update", "settings");
  done("/admin/settings?saved=1");
}

export async function createApiKey(_prev: unknown, fd: FormData): Promise<{ key?: string; error?: string }> {
  const admin = await requireUser("admin");
  const name = str(fd, "name");
  if (!name) return { error: "Nhập tên khóa (ví dụ: Phần mềm kho)" };
  const key = "vsk_" + randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(key).digest("hex");
  await q(`INSERT INTO api_keys (name, prefix, key_hash) VALUES ($1, $2, $3)`, [name, key.slice(0, 10), hash]);
  await audit(admin.id, "create", "api_key", undefined, { name });
  revalidatePath("/admin/settings");
  return { key };
}

export async function revokeApiKey(fd: FormData) {
  const admin = await requireUser("admin");
  await q(`UPDATE api_keys SET revoked = TRUE WHERE id = $1`, [num(fd, "id")]);
  await audit(admin.id, "revoke", "api_key", num(fd, "id")!);
  done("/admin/settings?saved=1");
}
