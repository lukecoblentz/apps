export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/classes",
    "/assignments",
    "/calendar",
    "/analytics",
    "/subjects",
    "/settings",
    "/invite",
    "/api/classes/:path*",
    "/api/assignments/:path*",
    "/api/dashboard/:path*",
    "/api/settings/:path*",
    "/api/user/:path*",
    "/api/canvas/:path*",
    "/api/google/:path*",
    "/api/microsoft/:path*",
    "/api/subjects/:path*",
    "/api/study-sessions/:path*",
    "/api/analytics/:path*",
    "/api/bug-report"
  ]
};
