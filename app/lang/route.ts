import { NextResponse, type NextRequest } from "next/server";

// Chuyển ngôn ngữ VI/EN: lưu cookie rồi quay lại trang đang xem.
export function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("l") === "en" ? "en" : "vi";
  const next = req.nextUrl.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, req.url));
  res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
