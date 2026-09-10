import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// Two "surfaces" share one NextAuth instance:
//  - Staff/admin/trainer login -> users table, role one of ADMIN/MANAGER/FRONT_DESK/TRAINER
//  - Member self-service portal login -> members table, role MEMBER
// The `portal` credential field tells the authorize() callback which table to check.

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" }, // "staff" | "member"
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        const portal = (credentials?.portal as string | undefined) ?? "staff";

        if (!email || !password) return null;

        if (portal === "member") {
          const [member] = await db
            .select()
            .from(schema.members)
            .where(eq(schema.members.loginEmail, email))
            .limit(1);

          if (!member || !member.passwordHash) return null;
          const valid = await bcrypt.compare(password, member.passwordHash);
          if (!valid) return null;
          if (member.status === "SUSPENDED" || member.status === "CANCELLED") {
            // still allow login but the UI will show restricted state
          }

          return {
            id: `member:${member.id}`,
            name: `${member.firstName} ${member.lastName}`,
            email: member.loginEmail ?? undefined,
            role: "MEMBER",
            memberId: member.id,
          } as any;
        }

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: `user:${user.id}`,
          name: user.name,
          email: user.email,
          role: user.role,
          userId: user.id,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.userId = (user as any).userId;
        token.memberId = (user as any).memberId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).userId = token.userId;
        (session.user as any).memberId = token.memberId;
      }
      return session;
    },
  },
});
