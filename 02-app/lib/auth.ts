import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema/auth"

// Single-user app: email magic link via Resend.
// AUTH_SECRET and RESEND_API_KEY must be set in .env.local.
// Allowed email is locked to ALLOWED_EMAIL env var — any other address is rejected.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@nicelyput.com",
    }),
  ],
  callbacks: {
    signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAIL
      if (!allowed) return false
      return user.email === allowed
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
