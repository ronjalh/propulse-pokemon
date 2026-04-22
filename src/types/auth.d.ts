import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    credits?: number;
  }
}
