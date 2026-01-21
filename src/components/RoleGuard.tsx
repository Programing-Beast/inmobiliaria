import { useAuth } from "@/contexts/AuthContext";
import Unauthorized from "@/components/Unauthorized";

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
}

const normalizeRole = (role: string) => role.toLowerCase().trim();

const RoleGuard = ({ roles, children }: RoleGuardProps) => {
  const { profile } = useAuth();
  const rawRole = profile?.role || localStorage.getItem("userRole") || "";
  const normalizedRole = normalizeRole(rawRole);
  const allowed = roles.map(normalizeRole).includes(normalizedRole);

  if (!allowed) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};

export default RoleGuard;
