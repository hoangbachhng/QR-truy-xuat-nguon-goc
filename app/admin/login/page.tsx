import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { createSession, currentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "Đăng nhập quản trị" };

async function login(fd: FormData) {
  "use server";
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const u = await one<{ id: number; password_hash: string; active: boolean }>(`SELECT id, password_hash, active FROM users WHERE email = $1`, [email]);
  if (!u || !u.active || !(await verifyPassword(password, u.password_hash))) redirect("/admin/login?err=1");
  await createSession(u.id);
  await audit(u.id, "login", "user", u.id);
  redirect("/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await currentUser()) redirect("/admin");
  const { err } = await searchParams;
  return (
    <div className="brand-graphic flex min-h-screen [--g:280px] sm:[--g:420px] items-center justify-center bg-brand p-4">
      <form action={login} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <Logo className="mx-auto mb-2 h-7" />
        <p className="mb-6 text-center text-sm text-stone">Quản trị mô hình trình diễn</p>
        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Email hoặc mật khẩu không đúng.</p>}
        <label className="mb-3 block">
          <span className="lbl">Email</span>
          <input className="inp" name="email" type="email" autoComplete="username" required />
        </label>
        <label className="mb-5 block">
          <span className="lbl">Mật khẩu</span>
          <input className="inp" name="password" type="password" autoComplete="current-password" required />
        </label>
        <SubmitButton className="btn-primary w-full py-2.5" pendingText="Đang đăng nhập…">
          Đăng nhập
        </SubmitButton>
      </form>
    </div>
  );
}
