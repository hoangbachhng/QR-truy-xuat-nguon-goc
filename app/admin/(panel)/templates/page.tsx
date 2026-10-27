import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listTemplates } from "@/lib/repo";
import { Empty, Notice, PageHead } from "@/components/admin/ui";

export const metadata = { title: "Mẫu trường" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const templates = await listTemplates();
  return (
    <div>
      <PageHead
        title="Mẫu trường thông tin"
        subtitle="Bộ trường tùy chỉnh soạn sẵn theo cây trồng, áp vào mô hình mới để khỏi tạo lại từ đầu"
        actions={
          <Link href="/admin/templates/new" className="btn-primary">
            <Plus size={16} /> Thêm mẫu
          </Link>
        }
      />
      {sp.deleted && <Notice>Đã xóa mẫu.</Notice>}
      {templates.length === 0 ? (
        <Empty>Chưa có mẫu nào.</Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/templates/${t.id}`} className="card flex items-center gap-3 hover:border-brand">
                <ListChecks className="text-leaf" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-dark">{t.name}</p>
                  <p className="truncate text-sm text-stone">{t.fields.map((f: any) => f.label).join(" · ")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
