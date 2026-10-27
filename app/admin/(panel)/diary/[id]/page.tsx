import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { requireUser, can } from "@/lib/auth";
import { one } from "@/lib/db";
import { getModel, getSteps, getVariety, isAssigned, listModels } from "@/lib/repo";
import { modelProgress, stepTiming, todayVN } from "@/lib/format";
import { dict } from "@/lib/i18n";
import type { DiaryEntry } from "@/lib/types";
import { Empty, Notice, PageHead, STATUS_LABEL } from "@/components/admin/ui";
import { ImagesInput } from "@/components/admin/MediaInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteDiary, saveDiary } from "../../../actions";

export const metadata = { title: "Ghi nhật ký" };

export default async function DiaryForm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ model?: string; err?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const entry = isNew ? undefined : await one<DiaryEntry>(`SELECT * FROM diary_entries WHERE id = $1`, [Number(id)]);
  if (!isNew && !entry) notFound();
  if (entry && user.role === "reporter" && entry.author_id !== user.id) notFound();
  const modelId = entry?.model_id ?? (sp.model ? Number(sp.model) : undefined);

  // Bước 1: chọn mô hình
  if (!modelId) {
    const models = (await listModels(can(user, "editor") ? {} : { assignedTo: user.id })).filter((m) => m.status === "active" || !can(user, "editor"));
    return (
      <div>
        <PageHead title="Ghi nhật ký" subtitle="Chọn mô hình đang thăm" />
        {models.length ? (
          <ul className="space-y-2">
            {models.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/diary/new?model=${m.id}`} className="card flex items-center gap-3 hover:border-brand">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand">
                      {m.code} · {m.variety_code}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-stone">
                      <MapPin size={13} /> {[m.commune, m.province].filter(Boolean).join(", ")} · {m.season} · {STATUS_LABEL[m.status]}
                    </p>
                  </div>
                  <ChevronRight className="text-stone" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Chưa có mô hình nào được giao cho bạn.</Empty>
        )}
      </div>
    );
  }

  const model = await getModel(modelId);
  if (!model) notFound();
  if (user.role === "reporter" && !(await isAssigned(model.id, user.id))) notFound();
  const [variety, steps] = await Promise.all([getVariety(model.variety_id), model.process_id ? getSteps(model.process_id) : Promise.resolve([])]);
  const progress = modelProgress(model, steps, variety?.growth_days);
  const suggested = entry?.step_id ?? progress?.currentStep?.id ?? "";
  const t = dict("vi");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead
        back={isNew ? "/admin/diary/new" : "/admin/diary"}
        title={isNew ? "Ghi nhật ký" : "Sửa nhật ký"}
        subtitle={
          <>
            <b className="text-earth">{model.code}</b> · {variety?.code} · {[model.commune, model.province].filter(Boolean).join(", ")}
            {progress?.state === "growing" && ` · Ngày ${progress.day} sau gieo`}
          </>
        }
      />
      {sp.err && <Notice tone="red">{sp.err}</Notice>}

      <form action={saveDiary} className="space-y-4">
        <input type="hidden" name="model_id" value={model.id} />
        {entry && <input type="hidden" name="id" value={entry.id} />}

        <div className="card space-y-4">
          <label className="block">
            <span className="lbl">Thuộc bước nào trong quy trình chuẩn?</span>
            <select name="step_id" className="inp py-3" defaultValue={suggested}>
              <option value="">Ghi chép khác (không thuộc bước nào)</option>
              {steps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.title}
                  {s.timing_note ? ` — ${s.timing_note}` : s.day_from != null ? ` — ${stepTiming(s, t)}` : ""}
                </option>
              ))}
            </select>
            {!model.process_id && <span className="hint block">Mô hình chưa gắn quy trình kỹ thuật.</span>}
          </label>

          <label className="block">
            <span className="lbl">Ngày thực hiện</span>
            <input name="entry_date" type="date" className="inp py-3" defaultValue={entry?.entry_date ?? todayVN()} required />
          </label>

          <fieldset>
            <legend className="lbl">So với quy trình chuẩn</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["ok", "Đúng quy trình", "peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white"],
                  ["adjusted", "Có điều chỉnh", "peer-checked:border-gold peer-checked:bg-gold peer-checked:text-earth"],
                  ["none", "Chỉ ghi chép", "peer-checked:border-stone peer-checked:bg-stone peer-checked:text-white"],
                ] as const
              ).map(([v, label, cls]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="compliance" value={v} defaultChecked={(entry?.compliance ?? "ok") === v} className="peer sr-only" />
                  <span className={`block rounded-lg border border-line bg-white px-2 py-3 text-center text-sm font-bold ${cls}`}>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="lbl">Nội dung đã làm, quan sát</span>
            <textarea
              name="content"
              rows={5}
              className="inp"
              defaultValue={entry?.content ?? ""}
              placeholder="Ví dụ: Bón 40 kg Urê + 30 kg KCl/ha. Đòng dài khoảng 3 mm. Ruộng sạch cỏ."
            />
            <span className="hint block">Nếu có điều chỉnh so với quy trình, ghi rõ lý do.</span>
          </label>

          <div>
            <span className="lbl">Ảnh hiện trường</span>
            <ImagesInput name="images" folder="diary" camera initial={entry?.images ?? []} />
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-stone">Thêm tiêu đề, bản tiếng Anh</summary>
            <div className="mt-2 space-y-2">
              <input name="title" className="inp" placeholder="Tiêu đề (không bắt buộc)" defaultValue={entry?.title ?? ""} />
              <textarea name="content_en" rows={3} className="inp" placeholder="Nội dung tiếng Anh (không bắt buộc)" defaultValue={entry?.content_en ?? ""} />
            </div>
          </details>
        </div>

        <div className="sticky bottom-16 z-10 lg:bottom-4">
          <SubmitButton className="btn-primary w-full py-3.5 text-base shadow-lg">Lưu nhật ký</SubmitButton>
        </div>
      </form>

      {entry && (
        <form action={deleteDiary} className="mt-4 text-center">
          <input type="hidden" name="id" value={entry.id} />
          <SubmitButton className="text-sm text-red-700 underline" confirm="Xóa nhật ký này?" pendingText="Đang xóa…">
            Xóa nhật ký
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
