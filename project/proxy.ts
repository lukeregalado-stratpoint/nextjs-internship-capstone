// todo: task 2.2 - configure authentication middleware for route protection
// import { authmiddleware } from "@clerk/nextjs"

// note: next.js 16+ - the "middleware" file convention is deprecated.
// when implementing authentication, consider using the new "proxy" pattern.
// learn more: https://nextjs.org/docs/messages/middleware-to-proxy

// placeholder middleware - currently allows all routes for development
// todo: replace with actual clerk authmiddleware when authentication is implemented
import { clerkMiddleware } from "@clerk/nextjs/server"
 
// const isprotectedroute = createroutematcher([
//   "/dashboard(.*)",
//   "/projects(.*)",
//   "/analytics(.*)",
//   "/calendar(.*)",
//   "/team(.*)",
//   "/settings(.*)",
// ])


// clock skew tolerance widened from clerk's 5s default: a dev machine (or,
// in principle, any host) running a few seconds fast/slow otherwise causes
// every refreshed session token to look "issued in the future" and trips
// an infinite refresh loop. 20s covers realistic drift without meaningfully
// weakening the iat replay check the tolerance exists for.
export default clerkMiddleware({
  clockSkewInMs: 20_000,
})


 
export const config = {
  matcher: [
    // skip next.js, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // always run for api routes
    "/(api|trpc)(.*)",
    // always run for clerk-specific frontend api routes
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