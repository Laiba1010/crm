"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, ChevronsUpDown, Handshake, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full flex-col border-r bg-background">
      <div className="px-4 py-4 text-sm font-semibold">Workspace</div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                active ? "bg-blue-50 font-medium text-blue-700" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
        <div>
          <div className="font-medium">user@email.com</div>
          <div className="text-muted-foreground">Workspace</div>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>
    </aside>
  );
}
