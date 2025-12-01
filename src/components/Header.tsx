import { Search, Bell, Mail, Maximize2, Minimize2, ChevronDown, Globe } from "lucide-react";
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
import { useState } from "react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [language, setLanguage] = useState("en");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const notifications = [
    { id: 1, user: "Dr sultads", message: "Send you Photo", time: "29 July 2020 - 02:26 PM", avatar: "/avatars/1.jpg" },
    { id: 2, user: "KG", message: "Report created successfully", time: "29 July 2020 - 02:26 PM", badge: true },
    { id: 3, user: "System", message: "Reminder: Treatment Time!", time: "29 July 2020 - 02:26 PM", icon: "home" },
  ];

  return (
    <header className="header-sticky w-full bg-white border-b border-border shadow-header z-50">
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
          <div className="hidden md:flex items-center relative max-w-md w-full">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              className="pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                🇬🇧 English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("es")}>
                🇪🇸 Español
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("fr")}>
                🇫🇷 Français
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("de")}>
                🇩🇪 Deutsch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="max-h-96 overflow-y-auto p-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer mb-1"
                  >
                    {notif.avatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={notif.avatar} />
                        <AvatarFallback>{notif.user[0]}</AvatarFallback>
                      </Avatar>
                    ) : notif.badge ? (
                      <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center text-white text-xs font-semibold">
                        {notif.user}
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notif.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator className="my-0" />
              <div className="p-3 text-center">
                <a href="#" className="text-sm text-primary hover:underline">
                  See all notifications →
                </a>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Messages */}
          <Button variant="ghost" size="icon" className="h-10 w-10 hidden sm:flex">
            <Mail className="h-5 w-5" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hidden md:flex"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">John Doe</span>
                  <span className="text-xs text-muted-foreground">Owner</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Activity Log</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger">
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
