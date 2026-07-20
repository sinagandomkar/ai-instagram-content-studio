"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, Library, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "داشبورد", icon: LayoutDashboard },
  { href: "/discovery", label: "موتور محتوای وایرال", icon: Sparkles },
  { href: "/library", label: "کتابخانه", icon: Library },
  { href: "/settings", label: "تنظیمات", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-60 flex-col border-l bg-background/70 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center px-6 text-lg font-semibold">
          استودیو محتوای اینستاگرام
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen w-full flex-col md:me-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-xl md:px-8">
          <span className="text-sm text-muted-foreground">
            ابزار هوش مصنوعی برای تولید محتوای اینستاگرام
          </span>
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background/80 py-2 backdrop-blur-xl md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
