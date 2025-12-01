import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>("Owner");

  // Mock: Get role from localStorage or auth context
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole") || "Owner";
    setRole(storedRole);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        role={role}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet context={{ role }} />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-white py-4 px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>© 2025 W3CRM. All rights reserved.</span>
            <span>UI v1</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
