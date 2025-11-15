import { Home, Users2, LogIn, Menu, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onMenuClick?: () => void;
}

const Header = ({ currentRole, onRoleChange, onMenuClick }: HeaderProps) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2 min-w-0">
          <img src={logoOriginal} alt="VIEW" className="h-8 w-auto shrink-0" />
          <span className="font-semibold hidden sm:inline truncate">{t('header.title')}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex gap-2 bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20"
          >
            <Users2 className="w-4 h-4" />
            {t('header.contactAgent')}
          </Button>
          
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[90px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={currentRole} onValueChange={onRoleChange}>
            <SelectTrigger className="w-[120px] h-9 text-sm hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Owner">{t('roles.owner')}</SelectItem>
              <SelectItem value="Tenant">{t('roles.tenant')}</SelectItem>
              <SelectItem value="Super Admin">{t('roles.superAdmin')}</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            size="sm" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-9"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.login')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
