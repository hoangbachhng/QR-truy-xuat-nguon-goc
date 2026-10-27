import { Camera, QrCode, MousePointerClick } from "lucide-react";
import { dict, getLang } from "@/lib/i18n";
import { PublicFooter, PublicHeader } from "@/components/public/PublicHeader";

export const dynamic = "force-dynamic";

// Trang chủ công khai: chỉ hướng dẫn quét QR. Mỗi mã QR mở thẳng trang của đúng một mô hình (/m/<mã>);
// danh sách và quản lý mô hình chỉ có trong trang quản trị.
export default async function Home() {
  const lang = await getLang();
  const t = dict(lang);
  const steps = [
    { icon: Camera, text: t.scanStep1 },
    { icon: QrCode, text: t.scanStep2 },
    { icon: MousePointerClick, text: t.scanStep3 },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader lang={lang} path="/" />
      <section className="brand-graphic bg-brand text-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-2xl font-bold sm:text-3xl">{t.landingTitle}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">{t.scanHint}</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon size={20} />
              </span>
              <span className="text-[15px]">
                <b className="text-brand">{i + 1}.</b> {text}
              </span>
            </li>
          ))}
        </ol>
      </main>
      <PublicFooter text={t.footer} loginLabel={t.staffLogin} />
    </div>
  );
}
