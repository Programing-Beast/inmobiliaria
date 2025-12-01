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
  X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import logoOriginal from "@/assets/logo-original.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  role?: string;
}

const Sidebar = ({ isOpen = false, onClose, role = "Owner" }: SidebarProps) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Define menu items with role permissions
  const allNavItems = [
    {
      key: "dashboard",
      label: t('nav.dashboard'),
      icon: LayoutGrid,
      path: "/dashboard",
      roles: ["Owner", "Tenant"] // Available to both
    },
    {
      key: "finance",
      label: t('nav.finances'),
      icon: DollarSign,
      path: "/finanzas",
      roles: ["Owner", "Tenant"] // Available to both
    },
    {
      key: "reservations",
      label: t('nav.reservations'),
      icon: Calendar,
      path: "/reservas",
      roles: ["Owner", "Tenant"] // Available to both
    },
    {
      key: "incidents",
      label: t('nav.incidents'),
      icon: AlertCircle,
      path: "/incidencias",
      roles: ["Owner", "Tenant"] // Available to both
    },
    {
      key: "approvals",
      label: t('nav.approvals'),
      icon: ShieldCheck,
      path: "/aprobaciones",
      roles: ["Owner"] // Only for Owners
    },
  ];

  // Filter menu items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(role));

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
              JD
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">Owner</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
