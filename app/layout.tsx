import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mô hình trình diễn | Vinaseed", template: "%s | Vinaseed" },
  description: "Quy trình kỹ thuật, nhật ký thực tế và truy xuất nguồn gốc lô giống tại các mô hình trình diễn của Vinaseed.",
  icons: { icon: "/brand/mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#005b36",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
