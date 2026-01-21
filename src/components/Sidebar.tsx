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
  UserCog,
  Building2,
  Home,
  Dumbbell
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
      roles: ["owner", "tenant", "regular_user", "super_admin"] // Resident reservations
    },
    {
      key: "reservationsAdmin",
      label: t('nav.reservationsAdmin'),
      icon: Calendar,
      path: "/reservations-management",
      roles: ["owner", "super_admin"] // Admin reservations management
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
    {
      key: "buildings",
      label: t('nav.buildings'),
      icon: Building2,
      path: "/buildings",
      roles: ["super_admin", "owner"] // Super Admin and Owner
    },
    {
      key: "units",
      label: t('nav.units'),
      icon: Home,
      path: "/units",
      roles: ["super_admin", "owner"] // Super Admin and Owner
    },
    {
      key: "amenities",
      label: t('nav.amenities'),
      icon: Dumbbell,
      path: "/amenities",
      roles: ["super_admin", "owner"] // Super Admin and Owner
    },
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
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-border transition-all duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={logoOriginal} alt="Logo" className="h-8 w-auto" />
            </div>
          )}

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Collapse button for desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8"
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                  "hover:bg-muted/80",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                  collapsed && "justify-center"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive && "text-primary"
                    )} />
                    {!collapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Feature Section */}
          {!collapsed && (
            <>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3 px-3">
                Our Features
              </div>

              <div className="space-y-1">
                <NavLink
                  to="#"
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "hover:bg-muted/80",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CheckSquare className="h-5 w-5 shrink-0" />
                  <span className="text-sm">Tasks</span>
                </NavLink>
              </div>
            </>
          )}
        </nav>

        {/* User Section at Bottom */}
        <div className="border-t border-border p-3 shrink-0">
        <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-muted/50",
            collapsed && "justify-center"
          )}>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
