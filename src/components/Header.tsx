import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { UnitSwitcher } from "@/components/UnitSwitcher";
import { OwnerContextSwitcher } from "@/components/OwnerContextSwitcher";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // Get user info from auth context or localStorage (fallback)
  const userName = profile?.full_name || localStorage.getItem("userName") || "Usuario";
  const userRole = profile?.role || localStorage.getItem("userRole") || "tenant";

  // Generate initials from name
  const userInitials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      // Sign out with Supabase
      const { error } = await signOut();

      if (error) {
        toast.error("Error al cerrar sesión");
        return;
      }

      // Show success message
      toast.success("Sesión cerrada correctamente");

      // Redirect to login
      navigate("/login");
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Error inesperado al cerrar sesión");
    }
  };

  return (
    <header className="header-sticky z-50 w-full border-b border-orange-100 bg-white/95 shadow-header backdrop-blur">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left side - Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search bar */}
          <div className="relative hidden w-full max-w-xl items-center md:flex">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-primary" />
            <Input
              type="text"
              placeholder={t("header.searchPlaceholder")}
              className="h-12 rounded-full border border-primary/35 bg-orange-50/80 pl-11 pr-4 text-sm text-zinc-800 shadow-[0_0_0_3px_rgba(255,92,0,0.12)] placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Owner context selector (owner role only) */}
          <OwnerContextSwitcher />

          {/* Unit Switcher for users with multiple units */}
          <UnitSwitcher variant="dropdown" className="hidden lg:flex" />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userRole}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2 border-b border-border">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                <User className="h-4 w-4 mr-2" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
