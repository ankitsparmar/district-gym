import { auth } from "@/auth";
import { NextResponse } from "next/server";

const STAFF_ROLES = ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as any)?.role as string | undefined;

  if (pathname.startsWith("/admin")) {
    if (!role || !STAFF_ROLES.includes(role)) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    // Manager/admin-only sections
    const adminOnly = ["/admin/expenses", "/admin/staff", "/admin/audit-log", "/admin/plans"];
    if (adminOnly.some((p) => pathname.startsWith(p)) && !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/portal")) {
    if (role !== "MEMBER") {
      const url = new URL("/member-login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
