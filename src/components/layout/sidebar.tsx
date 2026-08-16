"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  CreditCard,
  ScrollText,
  Settings,
  HandCoins,
  LayoutTemplate,
  LogOut,
  ChevronLeft,
  ImageIcon,
  Wand2,
  ImageUp,
  HelpCircle,
} from "lucide-react";

import { useApp } from "@/lib/store";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Black Chips", href: "/black-chips", icon: HandCoins },
  { name: "Chips Trivia", href: "/chips-trivia", icon: HelpCircle },
  { name: "Image Host", href: "/img-host", icon: ImageUp },
  { name: "Gallery", href: "/gallery", icon: ImageIcon },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  // { name: "PSD Editor", href: "/psd-editor", icon: Wand2 },
  // { name: "Logs", href: "/logs", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, logoutUser } = useApp();

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "w-64 border-r bg-sidebar flex-shrink-0 flex flex-col min-h-screen",
          "fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <span className="text-xl font-bold tracking-tight">ECON <span className="text-muted-foreground text-sm font-normal">Inner Circle</span></span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
        {currentUser.role === "Boss" && (
          <>
          <Link
            href="/salary"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === "/salary"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Salary</span>
          </Link>
          <Link
            href="/logs"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === "/logs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span>Logs</span>
          </Link>
          
          </>
        )}
      </nav>
      
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase flex-shrink-0">
            {currentUser.username.substring(0, 2)}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-medium leading-none mb-1 truncate">{currentUser.username}</span>
            <span className="text-xs text-muted-foreground leading-none">{currentUser.role}</span>
          </div>
        </div>
        <button
          onClick={logoutUser}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  </>
  );
}