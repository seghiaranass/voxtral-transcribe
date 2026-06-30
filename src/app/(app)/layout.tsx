import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";

// Protected shell. Middleware already gates these routes; this is defense-in-depth
// and gives us the session (email) for the nav.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav email={session.user.email ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
