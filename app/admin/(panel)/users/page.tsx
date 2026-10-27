import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { listUsers } from "@/lib/repo";
import { Notice, PageHead, Section } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createUser, updateUser } from "../../actions";

export const metadata = { title: "Người dùng" };

const ROLE_DESC = {
  admin: "Toàn quyền, quản lý tài khoản và khóa API. Dành cho ĐMST&CĐS, sau bàn giao cho Marketing.",
  editor: "Quản lý mô hình, quy trình, giống, lô giống; duyệt nhật ký. Dành cho cán bộ Marketing.",
  reporter: "Chỉ ghi nhật ký cho các mô hình được giao. Dành cho cán bộ kinh doanh.",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const me = await requireUser("admin");
  const sp = await searchParams;
  const users = await listUsers();
  return (
    <div>
      <PageHead title="Người dùng và phân quyền" subtitle="Bàn giao quản trị: tạo tài khoản Quản trị cho người nhận, sau đó khóa tài khoản cũ" />
      {sp.saved && <Notice>Đã lưu.</Notice>}
      {sp.err && <Notice tone="red">{sp.err}</Notice>}

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {(Object.keys(ROLE_DESC) as (keyof typeof ROLE_DESC)[]).map((r) => (
          <div key={r} className="rounded-lg bg-white p-3 text-sm">
            <b className="text-brand">{ROLE_LABEL[r]}</b>
            <p className="text-stone">{ROLE_DESC[r]}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {users.map((u) => (
            <form key={u.id} action={updateUser} className="card grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={u.id} />
              <label className="block">
                <span className="text-xs text-stone">{u.email}</span>
                <input name="name" className="inp" defaultValue={u.name} required />
              </label>
              <label className="block">
                <span className="text-xs text-stone">Vai trò</span>
                <select name="role" className="inp" defaultValue={u.role}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-stone">Điện thoại</span>
                <input name="phone" className="inp" defaultValue={u.phone ?? ""} />
              </label>
              <div className="flex items-center gap-3 sm:pb-2">
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="active" defaultChecked={u.active} className="accent-[#005b36]" /> Hoạt động
                </label>
              </div>
              <label className="block sm:col-span-3">
                <input name="password" type="password" className="inp" placeholder="Đặt mật khẩu mới (để trống nếu không đổi)" autoComplete="new-password" />
              </label>
              <SubmitButton className="btn">{u.id === me.id ? "Lưu (bạn)" : "Lưu"}</SubmitButton>
            </form>
          ))}
        </div>
        <Section title="Thêm người dùng">
          <form action={createUser} className="space-y-3">
            <input name="name" className="inp" placeholder="Họ tên" required />
            <input name="email" type="email" className="inp" placeholder="Email đăng nhập" required />
            <input name="phone" className="inp" placeholder="Điện thoại" />
            <select name="role" className="inp" defaultValue="reporter">
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input name="password" type="password" className="inp" placeholder="Mật khẩu (≥ 8 ký tự)" minLength={8} required autoComplete="new-password" />
            <SubmitButton className="btn-primary w-full">Tạo tài khoản</SubmitButton>
          </form>
        </Section>
      </div>
    </div>
  );
}
