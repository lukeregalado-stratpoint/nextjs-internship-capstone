// TODO: Task 2.2 - Configure authentication middleware for route protection
// import { authMiddleware } from "@clerk/nextjs"

// NOTE: Next.js 16+ - The "middleware" file convention is deprecated.
// When implementing authentication, consider using the new "proxy" pattern.
// Learn more: https://nextjs.org/docs/messages/middleware-to-proxy

// Placeholder middleware - currently allows all routes for development
// TODO: Replace with actual Clerk authMiddleware when authentication is implemented
import { clerkMiddleware } from "@clerk/nextjs/server"
 
// const isProtectedRoute = createRouteMatcher([
//   "/dashboard(.*)",
//   "/projects(.*)",
//   "/analytics(.*)",
//   "/calendar(.*)",
//   "/team(.*)",
//   "/settings(.*)",
// ])


// Clock skew tolerance widened from Clerk's 5s default: a dev machine (or,
// in principle, any host) running a few seconds fast/slow otherwise causes
// every refreshed session token to look "issued in the future" and trips
// an infinite refresh loop. 20s covers realistic drift without meaningfully
// weakening the iat replay check the tolerance exists for.
export default clerkMiddleware({
  clockSkewInMs: 20_000,
})


 
export const config = {
  matcher: [
    // skip Next.js, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // always run for API routes
    "/(api|trpc)(.*)",
    // always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
}


/*
TODO: Task 2.2 Implementation Notes for Interns:
- Install and configure Clerk
- Set up authMiddleware to protect routes
- Configure public routes: ["/", "/sign-in", "/sign-up"]
- Protect all dashboard routes: ["/dashboard", "/projects"]
- Add proper redirects for unauthenticated users

Example implementation when ready:
export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  ignoredRoutes: [],
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
*/