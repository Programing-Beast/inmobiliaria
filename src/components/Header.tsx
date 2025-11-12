import { Home, Users2, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoOriginal from "@/assets/logo-original.png";

interface HeaderProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onMenuClick?: () => void;
}

const Header = ({ currentRole, onRoleChange, onMenuClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <img src={logoOriginal} alt="VIEW" className="h-8 w-auto" />
          <span className="font-semibold hidden sm:inline">Portal de Residentes</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex gap-2 bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20"
          >
            <Users2 className="w-4 h-4" />
            Contactar agente
          </Button>
          
          <Select value={currentRole} onValueChange={onRoleChange}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="Tenant">Tenant</SelectItem>
              <SelectItem value="Super Admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            size="sm" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            <LogIn className="w-4 h-4" />
            Ingresar
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
