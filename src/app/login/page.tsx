import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { registrationAllowed } from "@/lib/registration";

export const metadata = { title: "Sign in — Voxtral" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm registrationAllowed={registrationAllowed()} />
    </main>
  );
}
