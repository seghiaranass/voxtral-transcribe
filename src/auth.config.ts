import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config (no DB / bcrypt imports). Shared by both the full
// Node-runtime auth instance (src/auth.ts) and the middleware (src/middleware.ts).
// Route protection lives in the `authorized` callback so middleware can enforce it.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isAuthPage = pathname === "/login" || pathname === "/register";
      // Auth.js handlers + the public register endpoint must stay reachable.
      const isPublicApi =
        pathname.startsWith("/api/auth") || pathname === "/api/register";

      if (isPublicApi) return true;

      if (isAuthPage) {
        // Already signed in → send to dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Everything else is protected; returning false triggers redirect to signIn page.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // real providers are attached in src/auth.ts (Node runtime)
} satisfies NextAuthConfig;
