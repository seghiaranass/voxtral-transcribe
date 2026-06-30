"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm({ registrationAllowed }: { registrationAllowed: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const res = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <AudioLines className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">Voxtral</span>
        </div>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Enter your credentials to access your transcriptions.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          {registrationAllowed && (
            <p className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
