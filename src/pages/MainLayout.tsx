import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { LogOut } from "lucide-react";

const MainLayout = () => {
  const [currentRole, setCurrentRole] = useState("Owner");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-12 gap-0">
        <Sidebar 
          currentRole={currentRole} 
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <main className="col-span-12 md:col-span-9 p-4 md:p-6 overflow-x-hidden">
          <Outlet context={{ role: currentRole }} />
        </main>
      </div>

      <footer className="border-t border-border bg-white mt-6">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
          <span>UI v1 · Sin conexión real</span>
          <span className="inline-flex items-center gap-2 cursor-pointer hover:text-foreground">
            <LogOut className="w-4 h-4" />
            Salir
          </span>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
