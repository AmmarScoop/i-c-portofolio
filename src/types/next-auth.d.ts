import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "ADMIN" | "CHILD";
      childId: string | null;
    };
  }
  interface User {
    id: string;
    role: "ADMIN" | "CHILD";
    childId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: "ADMIN" | "CHILD";
    childId: string | null;
  }
}
