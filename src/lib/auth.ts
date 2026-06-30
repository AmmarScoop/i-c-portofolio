import { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { child: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // Stored as a plain String column (see src/lib/enums.ts for why); narrowed
          // here to satisfy the NextAuth `User.role` type augmented in next-auth.d.ts.
          role: user.role as "ADMIN" | "CHILD",
          childId: user.child?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.childId = (user as any).childId;
        token.uid = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).role = token.role as string;
        (session.user as any).childId = token.childId as string | null;
      }
      return session;
    },
  },
};

/** Server-side helper: get the current session (or null) in server components / route handlers. */
export function getAuthSession() {
  return getServerSession(authOptions);
}

/** Throws-free guard: returns the session only if the user is an ADMIN, else null. */
export async function requireAdmin() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

/** Throws-free guard: returns the session only if the user is a CHILD, else null. */
export async function requireChild() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "CHILD") return null;
  return session;
}
