import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe proxy (Next.js 16's renamed middleware): instantiates Auth.js from the
// DB-free config and uses its `authorized` callback (in auth.config.ts) to protect routes.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
