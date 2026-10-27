import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, MapPin, ChevronRight } from "lucide-react";
import { dict, getLang, pick } from "@/lib/i18n";
import { getModelByCode, listModels } from "@/lib/repo";
import { fmtDate } from "@/lib/format";
import { slugCode } from "@/lib/format";
import { PublicFooter, PublicHeader } from "@/components/public/PublicHeader";

export const dynamic = "force-dynamic";

async function find(formData: FormData) {
  "use server";
  const code = slugCode(String(formData.get("code") || ""));
  if (code && (await getModelByCode(code))) redirect(`/m/${code}`);
  redirect(`/?notfound=${encodeURIComponent(code)}`);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ notfound?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = dict(lang);
  const models = await listModels({ publishedOnly: true });
  return (
    <div className="min-h-screen">
      <PublicHeader lang={lang} path="/" />
      <section className="brand-arcs bg-brand text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-bold sm:text-3xl">{t.allModels}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">{t.scanHint}</p>
          <form action={find} className="mt-5 flex max-w-md gap-2">
            <input
              name="code"
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 rounded-lg border-0 px-3 py-2.5 text-earth placeholder:text-stone"
              aria-label={t.searchPlaceholder}
            />
            <button className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 font-bold text-earth">
              <Search size={16} /> {t.find}
            </button>
          </form>
          {sp.notfound !== undefined && (
            <p className="mt-2 text-sm text-gold">
              {t.notFound}: {sp.notfound}
            </p>
          )}
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {models.map((m) => (
            <li key={m.id}>
              <Link href={`/m/${m.code}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 hover:border-brand">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone">
                    {m.code} · {m.season}
                  </p>
                  <p className="font-bold text-brand-dark">{pick(lang, m.variety_name, null)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-stone">
                    <MapPin size={13} /> {m.province}
                    {m.sow_date && ` · ${t.sowDate} ${fmtDate(m.sow_date)}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    m.status === "active" ? "bg-gold/25 text-earth-2" : "bg-brand/10 text-brand"
                  }`}
                >
                  {t[`status_${m.status}` as const]}
                </span>
                <ChevronRight size={18} className="text-stone" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter text={t.footer} />
    </div>
  );
}
