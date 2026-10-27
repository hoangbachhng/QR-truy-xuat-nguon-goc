import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHead({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-1 inline-flex items-center text-sm text-stone hover:text-brand">
            <ChevronLeft size={16} /> Quay lại
          </Link>
        )}
        <h1 className="text-xl font-bold text-brand sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-stone">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, desc, children, aside }: { title: string; desc?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="border-l-4 border-gold pl-2 font-bold text-brand">{title}</h2>
          {desc && <p className="mt-1 text-sm text-stone">{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function F({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "green" | "gold" | "red" | "brown"; children: React.ReactNode }) {
  const cls = {
    gray: "bg-mist text-stone",
    green: "bg-brand/10 text-brand",
    gold: "bg-gold/25 text-earth-2",
    red: "bg-red-50 text-red-700",
    brown: "bg-earth/10 text-earth",
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}

export function Notice({ tone = "green", children }: { tone?: "green" | "red" | "gold"; children: React.ReactNode }) {
  const cls = { green: "border-brand/30 bg-brand/5 text-brand-dark", red: "border-red-200 bg-red-50 text-red-800", gold: "border-gold/50 bg-gold/10 text-earth" }[tone];
  return <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line bg-white/60 p-6 text-center text-sm text-stone">{children}</div>;
}

export const STATUS_LABEL = { active: "Đang trình diễn", harvested: "Đã thu hoạch", closed: "Đã kết thúc" } as const;
export const COMPLIANCE_LABEL = { ok: "Đúng quy trình", adjusted: "Có điều chỉnh", none: "Ghi chép" } as const;
