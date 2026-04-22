import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Propulse Pokemon</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your{" "}
            <span className="font-mono">@propulsentnu.no</span> Google account.
          </p>
        </div>

        <form action={signInWithGoogle}>
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>

        {error === "AccessDenied" && (
          <p className="text-sm text-red-500 text-center">
            Only @propulsentnu.no accounts can sign in.
          </p>
        )}
        {error && error !== "AccessDenied" && (
          <p className="text-sm text-red-500 text-center">
            Something went wrong — try again.
          </p>
        )}
      </div>
    </main>
  );
}
