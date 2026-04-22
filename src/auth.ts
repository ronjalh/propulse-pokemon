import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/lib/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

const PROPULSE_DOMAIN = "@propulsentnu.no";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // hd = hosted domain. Google will only show Workspace accounts on
      // @propulsentnu.no in the consent screen. Personal Gmails never even
      // reach our callback.
      authorization: {
        params: {
          hd: "propulsentnu.no",
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/signin",
    error: "/signin/error",
  },
  callbacks: {
    async signIn({ user, profile }) {
      // Defence-in-depth: even if someone bypasses `hd`, reject at the
      // callback. `profile.hd` is what Google actually signed, so prefer it
      // over user.email when both are present.
      const googleHd = (profile as { hd?: string } | undefined)?.hd;
      if (googleHd && googleHd !== "propulsentnu.no") return false;

      const email = (user?.email ?? "").toLowerCase();
      if (!email.endsWith(PROPULSE_DOMAIN)) return false;
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        session.user.credits = (user as { credits?: number }).credits ?? 0;
      }
      return session;
    },
  },
});
