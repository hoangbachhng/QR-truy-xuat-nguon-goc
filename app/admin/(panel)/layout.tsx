import { requireUser, can, ROLE_LABEL } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AdminNav, MobileNav } from "@/components/admin/AdminNav";
import { logout } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const level = can(user, "admin") ? "admin" : can(user, "editor") ? "editor" : "reporter";
  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="border-b border-line px-5 py-4">
          <Logo className="h-5" />
          <p className="mt-1 text-xs text-stone">Quản trị mô hình trình diễn</p>
        </div>
        <AdminNav level={level} />
        <div className="border-t border-line p-4 text-sm">
          <p className="font-bold">{user.name}</p>
          <p className="text-xs text-stone">{ROLE_LABEL[user.role]}</p>
          <form action={logout}>
            <button className="mt-2 text-xs text-stone underline hover:text-brand">Đăng xuất</button>
          </form>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo className="h-4" />
        <form action={logout} className="text-right text-xs">
          <span className="block font-bold">{user.name}</span>
          <button className="text-stone underline">Đăng xuất</button>
        </form>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-8">{children}</main>
      <MobileNav level={level} />
    </div>
  );
}
