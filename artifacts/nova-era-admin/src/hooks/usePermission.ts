import { useAuth } from "@/contexts/AuthContext";

const ROLE_LEVELS: Record<string, number> = {
  admin: 3,
  manager: 2,
  employee: 1,
};

export function usePermission() {
  const { user } = useAuth();
  const role = user?.role ?? "employee";
  const level = ROLE_LEVELS[role] ?? 0;

  return {
    role,
    isAdmin: role === "admin",
    isAdminOrManager: level >= 2,
    isEmployee: level >= 1,
    can: (minRole: "admin" | "manager" | "employee") =>
      level >= (ROLE_LEVELS[minRole] ?? 0),
  };
}
