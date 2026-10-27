import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="h-7" />
      <h1 className="text-xl font-bold text-brand">Không tìm thấy mô hình</h1>
      <p className="text-sm text-stone">Mã QR có thể đã cũ hoặc mô hình đang tạm ẩn. / Plot not found.</p>
      <Link href="/" className="rounded-lg bg-brand px-4 py-2 font-bold text-white">
        Về trang chủ
      </Link>
    </div>
  );
}
