import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVarieties } from "@/lib/repo";
import { Badge, Empty, Notice, PageHead } from "@/components/admin/ui";

export const metadata = { title: "Giống" };

export default async function VarietiesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const varieties = await listVarieties();
  return (
    <div>
      <PageHead
        title="Danh mục giống"
        actions={
          <Link href="/admin/varieties/new" className="btn-primary">
            <Plus size={16} /> Thêm giống
          </Link>
        }
      />
      {sp.deleted && <Notice>Đã xóa giống.</Notice>}
      {varieties.length === 0 ? (
        <Empty>Chưa có giống nào.</Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {varieties.map((v) => (
            <li key={v.id}>
              <Link href={`/admin/varieties/${v.id}`} className="card flex items-center gap-3 hover:border-brand">
                <Sprout className="text-leaf" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-dark">{v.code}</p>
                  <p className="truncate text-sm text-stone">{v.name}</p>
                </div>
                <Badge tone={v.crop === "lua" ? "green" : "gold"}>{v.crop === "lua" ? "Lúa" : "Ngô"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
