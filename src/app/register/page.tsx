import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { registrationAllowed } from "@/lib/registration";

export const metadata = { title: "Create account — Voxtral" };

export default function RegisterPage() {
  // Single-operator mode: registration disabled → no signup page.
  if (!registrationAllowed()) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <RegisterForm />
    </main>
  );
}
