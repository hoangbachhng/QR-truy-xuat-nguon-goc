import Link from "next/link";
import { AlertCircle, ScanLine, NotebookPen, MapPinned, CheckCircle2, Plus } from "lucide-react";
import { requireUser, can } from "@/lib/auth";
import { q } from "@/lib/db";
import { listModels, recentDiary } from "@/lib/repo";
import { daysBetween, fmtDate, todayVN } from "@/lib/format";
import { Badge, COMPLIANCE_LABEL, Notice, PageHead, Section, STATUS_LABEL, Empty } from "@/components/admin/ui";

export const metadata = { title: "Tổng quan" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const editor = can(user, "editor");
  const models = await listModels(editor ? {} : { assignedTo: user.id });
  const today = todayVN();
  const active = models.filter((m) => m.status === "active");
  const stale = active.filter((m) => !m.last_diary || daysBetween(m.last_diary, today) > 14);
  const [stats] = await q<{ diary7: number; scans30: number; pending: number }>(
    `SELECT
       (SELECT count(*)::int FROM diary_entries WHERE created_at > now() - interval '7 days') AS diary7,
       (SELECT count(*)::int FROM scans WHERE created_at > now() - interval '30 days') AS scans30,
       (SELECT count(*)::int FROM diary_entries WHERE NOT approved) AS pending`,
  );
  const recent = await recentDiary({ limit: 8, authorId: editor ? undefined : user.id });

  return (
    <div>
      <PageHead
        title={`Xin chào, ${user.name}`}
        subtitle={editor ? "Tình hình các mô hình trình diễn" : "Các mô hình bạn được giao"}
        actions={
          editor && (
            <Link href="/admin/models/new" className="btn-primary">
              <Plus size={16} /> Thêm mô hình
            </Link>
          )
        }
      />
      {sp.denied && <Notice tone="red">Tài khoản của bạn không có quyền vào trang đó.</Notice>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MapPinned} label="Đang trình diễn" value={active.length} />
        <Stat icon={CheckCircle2} label="Đã thu hoạch" value={models.filter((m) => m.status === "harvested").length} />
        <Stat icon={NotebookPen} label="Nhật ký 7 ngày qua" value={stats.diary7} />
        <Stat icon={ScanLine} label="Lượt quét QR 30 ngày" value={stats.scans30} />
      </div>

      {editor && stats.pending > 0 && (
        <Notice tone="gold">
          Có <b>{stats.pending}</b> nhật ký đang chờ duyệt.{" "}
          <Link href="/admin/diary?pending=1" className="font-bold underline">
            Xem và duyệt
          </Link>
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Mô hình cần cập nhật nhật ký" desc="Đang trình diễn nhưng chưa có nhật ký trong 14 ngày gần đây">
          {stale.length ? (
            <ul className="divide-y divide-line">
              {stale.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {m.code} · {m.variety_code}
                    </p>
                    <p className="text-xs text-stone">
                      {m.province} · {m.last_diary ? `Nhật ký gần nhất ${fmtDate(m.last_diary)}` : "Chưa có nhật ký"}
                    </p>
                  </div>
                  <Link href={`/admin/diary/new?model=${m.id}`} className="btn shrink-0">
                    <Plus size={14} /> Ghi
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-brand">
              <CheckCircle2 size={16} /> Tất cả mô hình đều được cập nhật đều đặn.
            </p>
          )}
        </Section>

        <Section title="Nhật ký mới nhất" aside={<Link href="/admin/diary" className="text-sm font-bold text-brand">Xem tất cả</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((d) => (
                <li key={d.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{d.model_code}</b>
                    <span className="text-stone">{fmtDate(d.entry_date)}</span>
                    <Badge tone={d.compliance === "ok" ? "green" : d.compliance === "adjusted" ? "gold" : "gray"}>{COMPLIANCE_LABEL[d.compliance]}</Badge>
                    {!d.approved && <Badge tone="red">Chờ duyệt</Badge>}
                  </div>
                  <p className="line-clamp-2 text-stone">
                    {d.step_title && <span className="text-earth">{d.step_title}: </span>}
                    {d.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Chưa có nhật ký nào.</Empty>
          )}
        </Section>
      </div>

      {!editor && (
        <div className="mt-5">
          <Section title="Mô hình được giao">
            {models.length ? (
              <ul className="divide-y divide-line">
                {models.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-bold">
                        {m.code} · {m.variety_code}
                      </p>
                      <p className="text-xs text-stone">
                        {m.season} · {m.province} · {STATUS_LABEL[m.status]}
                      </p>
                    </div>
                    <Link href={`/admin/diary/new?model=${m.id}`} className="btn-primary">
                      <Plus size={14} /> Nhật ký
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                <AlertCircle size={16} className="mx-auto mb-1" /> Bạn chưa được giao mô hình nào. Liên hệ người quản trị.
              </Empty>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof MapPinned; label: string; value: number }) {
  return (
    <div className="card">
      <p className="flex items-center gap-1.5 text-xs text-stone">
        <Icon size={15} className="text-leaf" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brand">{value}</p>
    </div>
  );
}
