import { useAuth } from "@/contexts/AuthContext";

const ROLE_LEVELS: Record<string, number> = {
  admin: 3,
  gerente: 2,
  funcionario: 1,
};

export function usePermission() {
  const { user } = useAuth();
  const role = user?.role ?? "funcionario";
  const level = ROLE_LEVELS[role] ?? 0;

  return {
    role,
    isAdmin: role === "admin",
    isAdminOrGerente: level >= 2,
    isEmployee: level >= 1,
    can: (minRole: "admin" | "gerente" | "funcionario") =>
      level >= (ROLE_LEVELS[minRole] ?? 0),
  };
}
