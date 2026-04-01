export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/classes",
    "/assignments",
    "/calendar",
    "/settings",
    "/api/classes/:path*",
    "/api/assignments/:path*",
    "/api/dashboard/:path*",
    "/api/settings/:path*",
    "/api/canvas/:path*",
    "/api/google/:path*"
  ]
};
