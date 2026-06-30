import { auth } from "@/auth";

/** Returns the logged-in user's id, or null if unauthenticated. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
