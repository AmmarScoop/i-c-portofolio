import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Route guard: ensures /admin/** is only reachable by ADMIN users and
// /child/** is only reachable by CHILD users. Unauthenticated users are
// redirected to /login. This is the server-side enforcement layer requested
// in the spec ("Protect all routes... Add middleware or server-side guards").
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/child") && token?.role !== "CHILD") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/child/:path*"],
};
