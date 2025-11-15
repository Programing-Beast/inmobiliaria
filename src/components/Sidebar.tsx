import { LayoutGrid, ShieldCheck, FileDown, CalendarDays, Ticket, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  currentRole: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ currentRole, isOpen = false, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  
  const navItems = {
    Owner: [
      { key: "dashboard", label: t('nav.dashboard'), icon: LayoutGrid, path: "/dashboard" },
      { key: "financials", label: t('nav.finances'), icon: FileText, path: "/finanzas" },
      { key: "documents", label: t('nav.documents'), icon: FileDown, path: "/documentos" },
      { key: "bookings", label: t('nav.reservations'), icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: t('nav.incidents'), icon: Ticket, path: "/incidencias" },
    ],
    Tenant: [
      { key: "dashboard", label: t('nav.dashboard'), icon: LayoutGrid, path: "/dashboard" },
      { key: "documents", label: t('nav.documents'), icon: FileDown, path: "/documentos" },
      { key: "bookings", label: t('nav.reservations'), icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: t('nav.incidents'), icon: Ticket, path: "/incidencias" },
    ],
    "Super Admin": [
      { key: "dashboard", label: t('nav.dashboard'), icon: LayoutGrid, path: "/dashboard" },
      { key: "approvals", label: t('nav.approvals'), icon: ShieldCheck, path: "/aprobaciones" },
      { key: "documents", label: t('nav.documents'), icon: FileDown, path: "/documentos" },
      { key: "bookings", label: t('nav.reservations'), icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: t('nav.incidents'), icon: Ticket, path: "/incidencias" },
    ],
  };

  const items = navItems[currentRole as keyof typeof navItems] || navItems.Owner;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "col-span-12 md:col-span-3 border-r border-border bg-sidebar",
        "fixed md:relative inset-y-0 left-0 z-50 w-64 md:w-auto",
        "transform transition-transform duration-200 ease-in-out md:transform-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="px-4 py-4 h-full overflow-y-auto">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Navegación
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors",
                  "hover:bg-sidebar-accent"
                )}
                activeClassName="bg-sidebar-accent font-medium"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
