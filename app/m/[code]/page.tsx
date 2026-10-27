import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Sprout,
  Wheat,
  Gauge,
  MapPin,
  Ruler,
  Users,
  Phone,
  MessageCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  Circle,
  Star,
  ShieldCheck,
  Database,
  ArrowDown,
} from "lucide-react";
import { q } from "@/lib/db";
import { dict, getLang, pick, type Dict, type Lang } from "@/lib/i18n";
import { getModelByCode, getProcess, getSteps, getVariety, listDiary, getLotByCode, lotLineage } from "@/lib/repo";
import { addDays, fmtDate, fmtNum, modelProgress, phoneDigits, todayVN, type Progress } from "@/lib/format";
import { md } from "@/lib/markdown";
import { fileUrl } from "@/lib/storage";
import { hasValue } from "@/lib/fields";
import type { CustomField, DiaryEntry, Lot, Model, Process, ProcessStep, Testimonial, Variety } from "@/lib/types";
import { PublicHeader, PublicFooter } from "@/components/public/PublicHeader";
import { Gallery } from "@/components/public/Gallery";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | undefined>> };
const TABS = ["tong-quan", "quy-trinh", "lo-giong"] as const;
type Tab = (typeof TABS)[number];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const m = await getModelByCode(code);
  if (!m) return { title: "Không tìm thấy mô hình" };
  const v = await getVariety(m.variety_id);
  return { title: `${v?.code} · ${m.code}`, description: `Mô hình trình diễn giống ${v?.name} – ${m.season || ""} ${m.province || ""}` };
}

export default async function ModelPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const lang = await getLang();
  const t = dict(lang);
  const model = await getModelByCode(code);
  if (!model || !model.published) notFound();

  if (sp.qr) {
    // Đếm lượt quét QR (không để lỗi thống kê làm hỏng trang)
    await q(`INSERT INTO scans (model_id, source) VALUES ($1, 'qr')`, [model.id]).catch(() => undefined);
  }

  const [variety, process, diary] = await Promise.all([
    getVariety(model.variety_id),
    model.process_id ? getProcess(model.process_id) : Promise.resolve(undefined),
    listDiary(model.id, true),
  ]);
  const steps = process ? await getSteps(process.id) : [];
  const progress = modelProgress(model, steps, variety?.growth_days);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "tong-quan";
  const path = `/m/${model.code}${tab !== "tong-quan" ? `?tab=${tab}` : ""}`;

  return (
    <div className="min-h-screen">
      <PublicHeader lang={lang} path={path} />
      <Hero model={model} variety={variety} t={t} lang={lang} progress={progress} />

      <nav className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl px-2">
          {TABS.map((k) => {
            const label = k === "tong-quan" ? t.tabOverview : k === "quy-trinh" ? t.tabProcess : t.tabLot;
            const active = k === tab;
            return (
              <Link
                key={k}
                href={k === "tong-quan" ? `/m/${model.code}` : `/m/${model.code}?tab=${k}`}
                scroll={false}
                className={`flex-1 border-b-[3px] px-2 py-3 text-center text-sm font-bold sm:flex-none sm:px-5 ${
                  active ? "border-gold text-brand" : "border-transparent text-stone hover:text-brand"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {tab === "tong-quan" && <Overview model={model} variety={variety} t={t} lang={lang} />}
        {tab === "quy-trinh" && <ProcessTab model={model} process={process} steps={steps} diary={diary} t={t} lang={lang} progress={progress} />}
        {tab === "lo-giong" && <LotTab model={model} t={t} />}
      </main>
      <PublicFooter text={t.footer} />
    </div>
  );
}

// ---------------------------------------------------------------- Phần đầu trang
function Hero({ model, variety, t, lang, progress }: { model: Model; variety?: Variety; t: Dict; lang: Lang; progress: Progress | null }) {
  const place = [model.commune, model.district, model.province].filter(Boolean).join(", ");
  const stage = progress?.currentStep ? pick(lang, progress.currentStep.stage, null) : "";
  return (
    <section className="brand-arcs bg-brand text-white">
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-5">
        <p className="text-sm text-gold">
          {t.demoModel} · {model.code}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{pick(lang, variety?.name, variety?.name_en)}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
          {model.season && <span>{model.season}</span>}
          {place && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {place}
            </span>
          )}
          {model.area_ha != null && <span>{fmtNum(model.area_ha)} ha</span>}
        </p>
      </div>
      <div className="mx-auto -mb-10 max-w-5xl px-4">
        <div className="relative -top-10 rounded-xl bg-white p-4 text-earth shadow-md">
          {!progress ? (
            <p className="text-sm text-stone">{t.notStarted}</p>
          ) : progress.state === "harvested" || progress.state === "closed" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-bold text-brand">
                <CheckCircle2 size={18} /> {progress.state === "harvested" ? t.harvested : t.closed}
              </span>
              {model.yield_actual != null && (
                <span className="text-sm">
                  {t.yieldActual}: <b className="text-lg text-brand">{fmtNum(model.yield_actual)}</b> tấn/ha
                </span>
              )}
            </div>
          ) : progress.state === "not_started" ? (
            <p className="text-sm">
              {t.notStarted} · {t.sowDate}: <b>{fmtDate(model.sow_date)}</b>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-bold text-earth">
                  {t.day} {progress.day}
                  {t.of}
                  {progress.total}
                  {stage && <span className="font-normal text-stone"> · {t.stage}: <b className="text-brand-dark">{stage}</b></span>}
                </span>
                <span className="font-bold text-brand">{progress.percent}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gold" style={{ width: `${progress.percent}%` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Tab Tổng quan
function Overview({ model, variety, t, lang }: { model: Model; variety?: Variety; t: Dict; lang: Lang }) {
  const required = [
    { icon: Sprout, label: t.sowDate, value: fmtDate(model.sow_date) },
    { icon: Wheat, label: t.headingDate, value: fmtDate(model.heading_date) },
    { icon: CalendarDays, label: t.harvestDate, value: fmtDate(model.harvest_date) },
    { icon: Gauge, label: t.yieldExpected, value: model.yield_expected != null ? `${fmtNum(model.yield_expected)} tấn/ha` : "" },
  ];
  const custom = (model.fields || []).filter((f) => f.type !== "testimonials" && hasValue(f));
  const testimonials = (model.fields || []).filter((f) => f.type === "testimonials" && hasValue(f));
  const phone = phoneDigits(model.staff_phone);

  return (
    <div className="space-y-5 pt-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {required.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-center gap-1.5 text-xs text-stone">
              <Icon size={15} className="text-leaf" /> {label}
            </div>
            <div className={`mt-1 font-bold ${value ? "text-earth" : "text-stone/70 text-sm font-normal"}`}>{value || t.notUpdated}</div>
          </div>
        ))}
      </section>

      <Card title={t.modelInfo}>
        {model.summary && <p className="mb-3 text-[15px]">{pick(lang, model.summary, model.summary_en)}</p>}
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Info icon={MapPin} label={t.location} value={[model.address, model.commune, model.district, model.province].filter(Boolean).join(", ")} />
          <Info icon={Ruler} label={t.area} value={model.area_ha != null ? `${fmtNum(model.area_ha)} ha` : ""} />
          <Info icon={CalendarDays} label={t.season} value={model.season || ""} />
          <Info icon={Users} label={t.farmer} value={model.farmer_name || ""} />
          {model.yield_actual != null && <Info icon={Gauge} label={t.yieldActual} value={`${fmtNum(model.yield_actual)} tấn/ha`} />}
          {custom.map((f) => (
            <CustomFieldView key={f.id} f={f} lang={lang} />
          ))}
        </dl>
        {model.lat != null && model.lng != null && (
          <a
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand underline"
            href={`https://www.google.com/maps?q=${model.lat},${model.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={14} /> {t.viewOnMap}
          </a>
        )}
      </Card>

      {testimonials.map((f) => (
        <Card key={f.id} title={pick(lang, f.label, f.label_en) || t.testimonials}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(f.value as Testimonial[]).map((x, i) => (
              <figure key={i} className="rounded-lg border border-line bg-mist/60 p-3">
                {x.rating ? (
                  <div className="mb-1 flex text-gold" aria-label={`${x.rating}/5`}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <Star key={k} size={15} fill={k < x.rating! ? "currentColor" : "none"} />
                    ))}
                  </div>
                ) : null}
                <blockquote className="text-[15px]">“{pick(lang, x.content, x.content_en)}”</blockquote>
                <figcaption className="mt-2 text-xs text-stone">
                  <b className="text-earth">{x.name}</b>
                  {[x.place, x.season].filter(Boolean).length > 0 && ` · ${[x.place, x.season].filter(Boolean).join(" · ")}`}
                </figcaption>
                {x.image && <Gallery images={[{ src: fileUrl(x.image) }]} size="sm" />}
              </figure>
            ))}
          </div>
        </Card>
      ))}

      {variety && (
        <Card title={t.varietyInfo}>
          {variety.origin && (
            <p className="text-[15px]">
              <b className="text-brand-dark">{t.origin}: </b>
              {pick(lang, variety.origin, variety.origin_en)}
            </p>
          )}
          {variety.characteristics && (
            <div className="prose-vs mt-2" dangerouslySetInnerHTML={{ __html: md(pick(lang, variety.characteristics, variety.characteristics_en)) }} />
          )}
          {variety.specs?.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {variety.specs.map((s, i) => (
                  <tr key={i} className="border-t border-line">
                    <th className="w-1/2 py-1.5 pr-2 text-left font-normal text-stone">{pick(lang, s.label, s.label_en)}</th>
                    <td className="py-1.5 font-bold">{pick(lang, s.value, s.value_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {(model.staff_name || phone) && (
        <section className="rounded-xl bg-earth p-4 text-white">
          <p className="text-xs text-white/70">{t.staff}</p>
          <p className="font-bold">{model.staff_name}</p>
          {phone && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 rounded-lg bg-gold py-2.5 font-bold text-earth">
                <Phone size={16} /> {t.call}
              </a>
              <a
                href={`https://zalo.me/${phone.replace(/^\+84/, "0")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-white/60 py-2.5 font-bold"
              >
                <MessageCircle size={16} /> {t.zalo}
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CustomFieldView({ f, lang }: { f: CustomField; lang: Lang }) {
  const label = pick(lang, f.label, f.label_en);
  if (f.type === "image")
    return (
      <div className="sm:col-span-2">
        <dt className="text-stone">{label}</dt>
        <Gallery images={[{ src: fileUrl(f.value.key), caption: f.value.caption }]} />
      </div>
    );
  let value: string = String(f.value);
  if (f.type === "number") value = `${fmtNum(Number(f.value))}${f.unit ? " " + f.unit : ""}`;
  if (f.type === "date") value = fmtDate(String(f.value));
  if (f.type === "textarea" || f.type === "text") value = pick(lang, String(f.value), f.value_en);
  const wide = f.type === "textarea";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-stone">{label}</dt>
      <dd className="whitespace-pre-line font-bold">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- Tab Quy trình & nhật ký
function ProcessTab({
  model,
  process,
  steps,
  diary,
  t,
  lang,
  progress,
}: {
  model: Model;
  process?: Process;
  steps: ProcessStep[];
  diary: DiaryEntry[];
  t: Dict;
  lang: Lang;
  progress: Progress | null;
}) {
  if (!process) return <p className="pt-6 text-stone">{t.noProcess}</p>;
  const byStep = new Map<number, DiaryEntry[]>();
  for (const d of diary) if (d.step_id) byStep.set(d.step_id, [...(byStep.get(d.step_id) || []), d]);
  const other = diary.filter((d) => !d.step_id || !steps.some((s) => s.id === d.step_id));
  const today = todayVN();

  return (
    <div className="space-y-4 pt-6">
      <Card title={pick(lang, process.title, process.title_en)}>
        <p className="text-xs text-stone">
          {pick(lang, process.region, process.region_en)} · {t.version} {process.version}
        </p>
        {process.intro && <div className="prose-vs mt-2" dangerouslySetInnerHTML={{ __html: md(pick(lang, process.intro, process.intro_en)) }} />}
        {process.source_file && (
          <a
            href={fileUrl(process.source_file)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand px-3 py-2 text-sm font-bold text-brand"
          >
            <FileText size={16} /> {t.sourceDoc} ({t.download})
          </a>
        )}
      </Card>

      <div className="hidden grid-cols-2 gap-4 px-1 text-sm font-bold text-brand-dark md:grid">
        <div>{t.standardProcess}</div>
        <div>{t.actualDiary}</div>
      </div>

      {steps.map((s, i) => {
        const entries = byStep.get(s.id) || [];
        const isCurrent = progress?.state === "growing" && progress.currentStep?.id === s.id;
        return (
          <div key={s.id} className={`grid gap-2 md:grid-cols-2 md:gap-4 ${isCurrent ? "rounded-2xl ring-2 ring-gold ring-offset-4 ring-offset-mist" : ""}`}>
            <StepCard s={s} index={i + 1} t={t} lang={lang} />
            <div className="space-y-2">
              <p className="px-1 text-xs font-bold text-stone md:hidden">{t.actualDiary}</p>
              {entries.length ? (
                entries.map((d) => <DiaryCard key={d.id} d={d} t={t} lang={lang} />)
              ) : (
                <PendingCard s={s} model={model} t={t} today={today} />
              )}
            </div>
          </div>
        );
      })}

      {other.length > 0 && (
        <Card title={t.otherNotes}>
          <div className="space-y-2">
            {other.map((d) => (
              <DiaryCard key={d.id} d={d} t={t} lang={lang} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StepCard({ s, index, t, lang }: { s: ProcessStep; index: number; t: Dict; lang: Lang }) {
  const timing = pick(lang, s.timing_note, s.timing_note_en);
  const content = pick(lang, s.content, s.content_en);
  const missingEn = lang === "en" && s.content && !s.content_en;
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{index}</span>
        <div className="min-w-0 flex-1">
          {s.stage && <p className="text-xs font-bold uppercase tracking-wide text-leaf">{s.stage}</p>}
          <h3 className="font-bold leading-snug text-brand-dark">{pick(lang, s.title, s.title_en)}</h3>
          {timing && <p className="mt-0.5 text-xs text-stone">{timing}</p>}
        </div>
      </div>
      {content && <div className="prose-vs mt-2" dangerouslySetInnerHTML={{ __html: md(content) }} />}
      {missingEn && <p className="mt-1 text-xs italic text-stone">{t.translationMissing}</p>}
      {s.materials?.length > 0 && (
        <table className="mt-3 w-full overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-mist text-left text-xs text-stone">
              <th className="px-2 py-1.5 font-normal">{t.item}</th>
              <th className="px-2 py-1.5 font-normal">{t.dose}</th>
            </tr>
          </thead>
          <tbody>
            {s.materials.map((m, k) => (
              <tr key={k} className="border-t border-line align-top">
                <td className="px-2 py-1.5">
                  {m.item}
                  {m.note && <span className="block text-xs text-stone">{m.note}</span>}
                </td>
                <td className="px-2 py-1.5 font-bold">{m.dose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {s.warning && (
        <p className="mt-3 flex gap-2 rounded-lg bg-gold/15 p-2.5 text-sm text-earth">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-earth-2" />
          <span>
            <b>{t.warning}: </b>
            {pick(lang, s.warning, s.warning_en)}
          </span>
        </p>
      )}
      <Gallery images={(s.images || []).map((im) => ({ src: fileUrl(im.key), caption: pick(lang, im.caption, im.caption_en) }))} />
    </article>
  );
}

const COMPLIANCE_STYLE = {
  ok: { cls: "bg-brand/10 text-brand", icon: CheckCircle2 },
  adjusted: { cls: "bg-gold/20 text-earth-2", icon: PencilLine },
  none: { cls: "bg-mist text-stone", icon: Circle },
} as const;

function DiaryCard({ d, t, lang }: { d: DiaryEntry; t: Dict; lang: Lang }) {
  const st = COMPLIANCE_STYLE[d.compliance];
  const label = d.compliance === "ok" ? t.compliance_ok : d.compliance === "adjusted" ? t.compliance_adjusted : t.compliance_none;
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{fmtDate(d.entry_date)}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>
          <st.icon size={13} /> {label}
        </span>
      </div>
      {d.title && <p className="mt-1 font-bold text-brand-dark">{d.title}</p>}
      {d.content && <p className="mt-1 whitespace-pre-line text-[15px]">{pick(lang, d.content, d.content_en)}</p>}
      <Gallery images={(d.images || []).map((im) => ({ src: fileUrl(im.key), caption: im.caption }))} />
      {d.author_name && <p className="mt-2 text-xs text-stone">{d.author_name}</p>}
    </article>
  );
}

function PendingCard({ s, model, t, today }: { s: ProcessStep; model: Model; t: Dict; today: string }) {
  let expected = "";
  if (model.sow_date && s.day_from != null) {
    const a = addDays(model.sow_date, s.day_from);
    const b = addDays(model.sow_date, s.day_to ?? s.day_from);
    expected = a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`;
  }
  const overdue = model.status === "active" && model.sow_date && s.day_to != null && addDays(model.sow_date, s.day_to) < today;
  return (
    <div
      className={`flex h-full min-h-16 items-center justify-center rounded-xl border border-dashed bg-white/60 p-4 text-center text-sm text-stone ${
        overdue ? "border-gold" : "border-line"
      }`}
    >
      <span>
        {t.pending}
        {expected && (
          <>
            <br />
            <span className="text-xs">
              {t.expected}: {expected}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Tab Lô giống
async function LotTab({ model, t }: { model: Model; t: Dict }) {
  if (!model.lot_code) return <p className="pt-6 text-stone">{t.noLot}</p>;
  const lot = await getLotByCode(model.lot_code);
  if (!lot)
    return (
      <p className="pt-6 text-stone">
        {t.lotNotFound}: <b>{model.lot_code}</b>
      </p>
    );
  const chain = await lotLineage(lot.code);
  const pct = (n: number | null) => (n == null ? "" : `${fmtNum(n, 2)}%`);
  const rows: [string, string][] = [
    [t.lotCode, lot.code],
    [t.seedClass, lot.seed_class || ""],
    [t.productionDate, fmtDate(lot.production_date)],
    [t.producer, lot.producer || ""],
    [t.germination, pct(lot.germination)],
    [t.purity, pct(lot.purity)],
    [t.moisture, pct(lot.moisture)],
    [t.testDate, fmtDate(lot.test_date)],
  ];
  return (
    <div className="space-y-4 pt-6">
      <Card title={`${t.lotCode}: ${lot.code}`}>
        <SourceBadge lot={lot} t={t} />
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-stone">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
        </dl>
        {lot.cert_file && (
          <a
            href={fileUrl(lot.cert_file)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand px-3 py-2 text-sm font-bold text-brand"
          >
            <ShieldCheck size={16} /> {t.certificate}
          </a>
        )}
      </Card>

      {chain.length > 0 && (
        <Card title={t.lineage}>
          <ol className="space-y-1">
            {chain.map((l, i) => (
              <li key={l.code}>
                <div className={`rounded-lg border p-3 text-sm ${l.code === lot.code ? "border-brand bg-brand/5" : "border-line bg-white"}`}>
                  <p className="font-bold text-brand-dark">{l.seed_class || l.code}</p>
                  <p className="text-xs text-stone">
                    {l.code}
                    {l.production_date && ` · ${fmtDate(l.production_date)}`}
                    {l.producer && ` · ${l.producer}`}
                  </p>
                </div>
                {i < chain.length - 1 && <ArrowDown size={16} className="mx-auto my-1 text-leaf" />}
              </li>
            ))}
            <li>
              <ArrowDown size={16} className="mx-auto my-1 text-leaf" />
              <div className="rounded-lg bg-brand p-3 text-sm text-white">
                <p className="font-bold">
                  {t.demoModel} {model.code}
                </p>
                <p className="text-xs text-white/80">{[model.season, model.province].filter(Boolean).join(" · ")}</p>
              </div>
            </li>
          </ol>
        </Card>
      )}
    </div>
  );
}

function SourceBadge({ lot, t }: { lot: Lot; t: Dict }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-xs text-stone">
      <Database size={12} /> {t.dataSource}: {lot.source === "wms" ? t.sourceWms : t.sourceManual}
    </span>
  );
}

// ---------------------------------------------------------------- Thành phần chung
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="mb-3 border-l-4 border-gold pl-2 font-bold text-brand">{title}</h2>
      {children}
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="flex items-center gap-1 text-stone">
        <Icon size={13} className="text-leaf" /> {label}
      </dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
