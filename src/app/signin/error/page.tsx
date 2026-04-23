import Link from "next/link";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

const MESSAGES: Record<string, string> = {
  AccessDenied:
    "Only @propulsentnu.no addresses can sign in. This app is limited to Propulse NTNU members.",
  Verification:
    "This sign-in link has expired or already been used. Request a new one.",
  Default: "Something went wrong while signing you in.",
};

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const message = MESSAGES[error ?? "Default"] ?? MESSAGES.Default;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign-in failed</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button render={<Link href="/signin" />} nativeButton={false}>
          Try again
        </Button>
      </div>
    </main>
  );
}
