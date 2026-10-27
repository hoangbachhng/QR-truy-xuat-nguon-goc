import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSetting } from "@/lib/repo";
import { baseUrl } from "@/lib/urls";
import { Badge, Notice, PageHead, Section } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ApiKeyForm } from "@/components/admin/ApiKeyForm";
import { revokeApiKey, saveSettings } from "../../actions";

export const metadata = { title: "Cài đặt, API" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireUser("admin");
  const sp = await searchParams;
  const requireApproval = await getSetting("require_diary_approval", false);
  const keys = await q<{ id: number; name: string; prefix: string; revoked: boolean; last_used_at: string | null; created_at: string }>(
    `SELECT id, name, prefix, revoked, last_used_at, created_at FROM api_keys ORDER BY created_at DESC`,
  );
  const storage = process.env.STORAGE_DRIVER === "s3" ? "S3 (lưu trữ đám mây)" : "Ổ đĩa server";
  const database = process.env.DATABASE_URL ? "PostgreSQL" : "PostgreSQL nhúng (PGlite) – chỉ dùng chạy thử";

  return (
    <div className="space-y-5">
      <PageHead title="Cài đặt và kết nối API" />
      {sp.saved && <Notice>Đã lưu.</Notice>}

      <Section title="Nhật ký">
        <form action={saveSettings} className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="require_diary_approval" defaultChecked={requireApproval} className="h-4 w-4 accent-[#005b36]" />
            Nhật ký của tài khoản <b>Ghi nhật ký</b> (cán bộ kinh doanh) phải được Biên tập duyệt rồi mới hiện công khai
          </label>
          <SubmitButton className="btn">Lưu</SubmitButton>
        </form>
      </Section>

      <Section title="Khóa API cho phần mềm kho" desc="Phần mềm kho dùng khóa này để đẩy dữ liệu lô giống sang website (giai đoạn 2). Tài liệu kỹ thuật: docs/api-lo-giong.md trong mã nguồn.">
        <ApiKeyForm />
        <div className="mt-4 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Khóa</th>
                <th>Dùng lần cuối</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="font-mono text-xs">{k.prefix}…</td>
                  <td className="text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString("vi-VN") : "Chưa dùng"}</td>
                  <td className="text-right">
                    {k.revoked ? (
                      <Badge tone="red">Đã thu hồi</Badge>
                    ) : (
                      <form action={revokeApiKey}>
                        <input type="hidden" name="id" value={k.id} />
                        <SubmitButton className="btn-danger py-1" confirm={`Thu hồi khóa "${k.name}"? Phần mềm đang dùng khóa này sẽ mất kết nối.`}>
                          Thu hồi
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg bg-mist p-3 font-mono text-xs leading-relaxed">
          <p>POST {baseUrl()}/api/v1/lots</p>
          <p>GET&nbsp; {baseUrl()}/api/v1/lots/&lt;mã lô&gt;</p>
          <p>Header: Authorization: Bearer &lt;khóa API&gt;</p>
        </div>
      </Section>

      <Section title="Môi trường đang chạy">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-stone">Tên miền trong mã QR</dt>
            <dd className="font-bold">{baseUrl()}</dd>
          </div>
          <div>
            <dt className="text-stone">Cơ sở dữ liệu</dt>
            <dd className="font-bold">{database}</dd>
          </div>
          <div>
            <dt className="text-stone">Lưu ảnh, tài liệu</dt>
            <dd className="font-bold">{storage}</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
