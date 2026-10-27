"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MapPinned,
  NotebookPen,
  BookOpenCheck,
  Sprout,
  Boxes,
  ListChecks,
  Users,
  Settings,
  Plus,
  Menu,
  X,
} from "lucide-react";

type Level = "admin" | "editor" | "reporter";
const ITEMS: { href: string; label: string; icon: typeof Users; min: Level }[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, min: "reporter" },
  { href: "/admin/models", label: "Mô hình", icon: MapPinned, min: "editor" },
  { href: "/admin/diary", label: "Nhật ký", icon: NotebookPen, min: "reporter" },
  { href: "/admin/processes", label: "Quy trình kỹ thuật", icon: BookOpenCheck, min: "editor" },
  { href: "/admin/varieties", label: "Giống", icon: Sprout, min: "editor" },
  { href: "/admin/lots", label: "Lô giống", icon: Boxes, min: "editor" },
  { href: "/admin/templates", label: "Mẫu trường", icon: ListChecks, min: "editor" },
  { href: "/admin/users", label: "Người dùng", icon: Users, min: "admin" },
  { href: "/admin/settings", label: "Cài đặt, API", icon: Settings, min: "admin" },
];
const RANK = { reporter: 1, editor: 2, admin: 3 };
const visible = (level: Level) => ITEMS.filter((i) => RANK[level] >= RANK[i.min]);
const isActive = (path: string, href: string) => (href === "/admin" ? path === href : path.startsWith(href));

export function AdminNav({ level }: { level: Level }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      <Link href="/admin/diary/new" className="btn-primary mb-3 w-full py-2.5">
        <Plus size={16} /> Nhật ký nhanh
      </Link>
      {visible(level).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
            isActive(path, href) ? "bg-brand/10 font-bold text-brand" : "text-earth hover:bg-mist"
          }`}
        >
          <Icon size={17} /> {label}
        </Link>
      ))}
    </nav>
  );
}

// Thanh điều hướng dưới cùng trên điện thoại, nút "+" lớn để ghi nhật ký nhanh ngoài đồng
export function MobileNav({ level }: { level: Level }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const items = visible(level);
  const main = items.filter((i) => ["/admin", "/admin/models", "/admin/diary"].includes(i.href));
  const rest = items.filter((i) => !main.includes(i));
  const tab = (href: string, label: string, Icon: typeof Users) => (
    <Link key={href} href={href} onClick={() => setMore(false)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(path, href) ? "font-bold text-brand" : "text-stone"}`}>
      <Icon size={20} /> {label}
    </Link>
  );
  return (
    <>
      {more && (
        <div className="no-print fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-3 bottom-20 rounded-2xl bg-white p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {rest.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-mist">
                <Icon size={18} className="text-brand" /> {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {main.slice(0, 2).map((i) => tab(i.href, i.label, i.icon))}
        <Link href="/admin/diary/new" className="-mt-5 flex flex-1 flex-col items-center text-[11px] font-bold text-brand" aria-label="Ghi nhật ký nhanh">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-earth shadow-lg ring-4 ring-white">
            <Plus size={26} />
          </span>
          Nhật ký
        </Link>
        {main.slice(2).map((i) => tab(i.href, i.label, i.icon))}
        {rest.length > 0 && (
          <button type="button" onClick={() => setMore((v) => !v)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-stone">
            {more ? <X size={20} /> : <Menu size={20} />} Thêm
          </button>
        )}
      </nav>
    </>
  );
}
