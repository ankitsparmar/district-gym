import { auth } from "@/auth";

export type StaffRole = "ADMIN" | "MANAGER" | "FRONT_DESK" | "TRAINER";

export async function requireStaff(roles?: StaffRole[]) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.userId as number | undefined;
  if (!session?.user || !role || role === "MEMBER") {
    throw new Error("Unauthorized: staff session required");
  }
  if (roles && !roles.includes(role as StaffRole)) {
    throw new Error(`Forbidden: requires one of ${roles.join(", ")}`);
  }
  return { session, role: role as StaffRole, userId: userId! };
}

export async function requireMember() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const memberId = (session?.user as any)?.memberId as number | undefined;
  if (!session?.user || role !== "MEMBER" || !memberId) {
    throw new Error("Unauthorized: member session required");
  }
  return { session, memberId };
}

export async function currentSession() {
  return auth();
}
