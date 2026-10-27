import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang, path }: { lang: Lang; path: string }) {
  const item = (l: Lang, label: string) =>
    l === lang ? (
      <span className="rounded px-1.5 py-0.5 bg-white text-brand font-bold">{label}</span>
    ) : (
      <a href={`/lang?l=${l}&next=${encodeURIComponent(path)}`} className="rounded px-1.5 py-0.5 hover:bg-white/15">
        {label}
      </a>
    );
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-white/50 p-0.5 text-xs text-white">
      {item("vi", "VI")}
      {item("en", "EN")}
    </div>
  );
}

export function PublicHeader({ lang, path }: { lang: Lang; path: string }) {
  return (
    <header className="bg-brand">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Trang chủ">
          <Logo variant="white" className="h-5 sm:h-6" />
        </Link>
        <LangSwitch lang={lang} path={path} />
      </div>
    </header>
  );
}

export function PublicFooter({ text }: { text: string }) {
  return (
    <footer className="mt-10 bg-earth text-white/80">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed">
        <Logo variant="white" className="mb-3 h-4" />
        <p className="font-bold text-white">{text}</p>
        <p>Số 1 Lương Định Của, Phương Mai, Đống Đa, Hà Nội · 024 3852 3294 · nsc@vinaseed.com.vn</p>
        <p>
          <a href="https://www.vinaseed.com.vn" className="underline" target="_blank" rel="noopener noreferrer">
            www.vinaseed.com.vn
          </a>
        </p>
      </div>
    </footer>
  );
}
