import { LayoutGrid, ShieldCheck, FileDown, CalendarDays, Ticket, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentRole: string;
}

const Sidebar = ({ currentRole }: SidebarProps) => {
  const navItems = {
    Owner: [
      { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
      { key: "financials", label: "Finanzas", icon: FileText, path: "/finanzas" },
      { key: "documents", label: "Documentos", icon: FileDown, path: "/documentos" },
      { key: "bookings", label: "Reservas", icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: "Incidencias", icon: Ticket, path: "/incidencias" },
    ],
    Tenant: [
      { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
      { key: "documents", label: "Documentos", icon: FileDown, path: "/documentos" },
      { key: "bookings", label: "Reservas", icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: "Incidencias", icon: Ticket, path: "/incidencias" },
    ],
    "Super Admin": [
      { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
      { key: "approvals", label: "Aprobaciones", icon: ShieldCheck, path: "/aprobaciones" },
      { key: "documents", label: "Documentos", icon: FileDown, path: "/documentos" },
      { key: "bookings", label: "Reservas", icon: CalendarDays, path: "/reservas" },
      { key: "incidents", label: "Incidencias", icon: Ticket, path: "/incidencias" },
    ],
  };

  const items = navItems[currentRole as keyof typeof navItems] || navItems.Owner;

  return (
    <aside className="col-span-12 md:col-span-3 border-r border-border bg-sidebar">
      <div className="px-4 py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Navegación
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
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
  );
};

export default Sidebar;
