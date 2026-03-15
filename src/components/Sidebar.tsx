import {
  LayoutGrid,
  Users,
  PieChart,
  DollarSign,
  FileText,
  Calendar,
  AlertCircle,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  X,
  Bell,
  Settings,
  Lock,
  UserCog
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import logoOriginal from "@/assets/logo-original.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getEnumTranslationKey } from "@/lib/i18n-helpers";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  role?: string;
}

const Sidebar = ({ isOpen = false, onClose, role: propRole }: SidebarProps) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Use profile role from auth context, fallback to prop or localStorage
  const rawRole = profile?.role || propRole || localStorage.getItem("userRole") || "tenant";
  const displayName = profile?.full_name || localStorage.getItem("userName") || "Usuario";

  // Normalize role to lowercase for comparison (database returns lowercase with underscores)
  const normalizeRole = (r: string): string => {
    return r.toLowerCase().replace(/ /g, "_");
  };

  const normalizedRole = normalizeRole(rawRole);
  const roleLabel = t(getEnumTranslationKey("user_role", normalizedRole));
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Define menu items with role permissions (matching portal_residentes_completo.html)
  const allNavItems = [
    {
      key: "dashboard",
      label: t('nav.dashboard'),
      icon: LayoutGrid,
      path: "/dashboard",
      roles: ["owner", "tenant", "super_admin", "regular_user"] // All roles
    },
    {
      key: "finance",
      label: t('nav.finances'),
      icon: DollarSign,
      path: "/finances",
      roles: ["owner"] // Only Owner
    },
    {
      key: "announcements",
      label: t('nav.announcements'),
      icon: Bell,
      path: "/announcements",
      roles: ["owner", "tenant", "super_admin"] // All except regular_user
    },
    {
      key: "reservations",
      label: t('nav.reservations'),
      icon: Calendar,
      path: "/reservations",
      roles: ["owner", "tenant", "regular_user"] // Resident reservations
    },
    {
      key: "reservationsAdmin",
      label: t('nav.reservationsAdmin'),
      icon: Calendar,
      path: "/reservations-management",
      roles: ["super_admin"] // Admin reservations management
    },
    {
      key: "incidents",
      label: t('nav.incidents'),
      icon: AlertCircle,
      path: "/incidents",
      roles: ["owner", "tenant", "super_admin"] // All except regular_user
    },
    {
      key: "approvals",
      label: t('nav.approvals'),
      icon: ShieldCheck,
      path: "/approvals",
      roles: ["super_admin"] // Only Super Admin
    },
    {
      key: "admin",
      label: t('nav.user'),
      icon: Settings,
      path: "/admin",
      roles: ["super_admin"] // Only Super Admin
    },
    {
      key: "permissions",
      label: t('nav.permissions'),
      icon: Lock,
      path: "/permissions",
      roles: ["super_admin"] // Only Super Admin
    },
    {
      key: "roles",
      label: t('nav.roles'),
      icon: UserCog,
      path: "/roles",
      roles: ["super_admin"] // Only Super Admin
    },
    // {
    //   key: "buildings",
    //   label: t('nav.buildings'),
    //   icon: Building2,
    //   path: "/buildings",
    //   roles: ["super_admin", "owner"] // Super Admin and Owner
    // },
  ];

  // Filter menu items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(normalizedRole));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 transition-all duration-300 lg:sticky",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <img src={logoOriginal} alt="Logo" className="h-8 w-auto" />
            </div>
          )}

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-100 hover:bg-zinc-900 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Collapse button for desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-white lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight className={cn(
              "h-5 w-5 transition-transform",
              collapsed ? "" : "rotate-180"
            )} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {!collapsed && (
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Main Menu
            </div>
          )}

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  "hover:bg-zinc-900 hover:text-white",
                  isActive
                    ? "bg-primary text-white shadow-[0_10px_30px_rgba(255,92,0,0.35)]"
                    : "text-zinc-300",
                  collapsed && "justify-center"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-white" : "text-zinc-400 group-hover:text-white"
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

        </nav>

        {/* User Section at Bottom */}
        <div className="shrink-0 border-t border-zinc-800 p-3">
        <div className={cn(
            "flex items-center gap-3 rounded-xl bg-zinc-900 p-3",
            collapsed && "justify-center"
          )}>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-zinc-400">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
