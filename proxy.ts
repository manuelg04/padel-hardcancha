import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin/agenda(.*)", "/admin/config(.*)"]);
const isSuperAdminRoute = createRouteMatcher([
  "/super-admin",
  "/super-admin/clubes(.*)",
]);
const isPlayerRoute = createRouteMatcher([
  "/mis-reservas(.*)",
  "/club/:slug/reservar",
  "/club/:slug/confirmar",
]);

function loginRoute(pathname: string) {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/super-admin")) return "/super-admin/login";
  return "/login";
}

const authProxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isProtected =
    isAdminRoute(request) || isSuperAdminRoute(request) || isPlayerRoute(request);

  if (!isProtected || (await convexAuth.isAuthenticated())) {
    return;
  }

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return nextjsMiddlewareRedirect(
    request,
    `${loginRoute(request.nextUrl.pathname)}?next=${encodeURIComponent(next)}`,
  );
});

export function proxy(request: Parameters<typeof authProxy>[0], event: Parameters<typeof authProxy>[1]) {
  return authProxy(request, event);
}

export default authProxy;

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
